import { PackageInfo } from "../types";

export function mainWebviewContent(
  packageMap: Map<string, PackageInfo>
): string {
  const packagesArray = Array.from(packageMap.values());
  const packagesJson = JSON.stringify(packagesArray);

  return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>NuGet Package Update</title>
	<style>
		body {
			font-family: var(--vscode-font-family);
			padding: 20px;
			color: var(--vscode-foreground);
			background-color: var(--vscode-editor-background);
		}
		h1 {
			font-size: 24px;
			margin-bottom: 20px;
		}
		.search-container {
			margin-bottom: 20px;
			display: flex;
			gap: 10px;
			align-items: center;
		}
		#searchInput {
			flex: 1;
			padding: 8px;
			font-size: 14px;
			background-color: var(--vscode-input-background);
			color: var(--vscode-input-foreground);
			border: 1px solid var(--vscode-input-border);
			border-radius: 2px;
		}
		.bulk-update-btn {
			padding: 8px 12px;
			background-color: var(--vscode-button-background);
			color: var(--vscode-button-foreground);
			border: none;
			border-radius: 4px;
			cursor: pointer;
			white-space: nowrap;
			font-size: 14px;
		}
		.bulk-update-btn:hover {
			background-color: var(--vscode-button-hoverBackground);
		}
		.bulk-update-btn:disabled {
			opacity: 0.5;
			cursor: not-allowed;
		}
		.refresh-btn {
			padding: 8px 12px;
			background-color: var(--vscode-button-secondaryBackground);
			color: var(--vscode-button-secondaryForeground);
			border: none;
			border-radius: 4px;
			cursor: pointer;
			white-space: nowrap;
			font-size: 14px;
		}
		.refresh-btn:hover {
			background-color: var(--vscode-button-secondaryHoverBackground);
		}
		#searchInput:focus {
			outline: 1px solid var(--vscode-focusBorder);
		}
		.package-list {
			margin-top: 20px;
		}
		.package-item {
			padding: 12px;
			margin-bottom: 8px;
			background-color: var(--vscode-editor-inactiveSelectionBackground);
			border-radius: 4px;
			border: 1px solid var(--vscode-panel-border);
		}
		.package-name {
			font-weight: bold;
			font-size: 16px;
			margin-bottom: 8px;
		}
		.consumer-item {
			margin-bottom: 4px;
			padding-left: 12px;
			border-left: 2px solid var(--vscode-panel-border);
			color: var(--vscode-descriptionForeground);
			font-size: 14px;
		}
		.version-conflict {
			color: var(--vscode-errorForeground);
			font-weight: bold;
			cursor: pointer;
			position: relative;
		}
		.version-conflict:hover {
			background-color: var(--vscode-list-hoverBackground);
			border-radius: 3px;
		}
		.tooltip {
			position: absolute;
			background-color: var(--vscode-editorHoverWidget-background);
			color: var(--vscode-editorHoverWidget-foreground);
			border: 1px solid var(--vscode-editorHoverWidget-border);
			border-radius: 4px;
			padding: 8px;
			font-size: 12px;
			white-space: nowrap;
			z-index: 1000;
			box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
			display: none;
			top: 100%;
			left: 0;
			margin-top: 4px;
		}
		.version-conflict:hover .tooltip {
			display: block;
		}
		.no-results {
			color: var(--vscode-descriptionForeground);
			font-style: italic;
			margin-top: 20px;
		}
		.package-count {
			color: var(--vscode-descriptionForeground);
			margin-bottom: 10px;
		}
	</style>
</head>
<body>
	<h1>NuGet Package Update</h1>
	<div class="search-container">
		<input type="text" id="searchInput" placeholder="Search installed packages..." />
		<button class="refresh-btn" onclick="refreshPackages()">Refresh</button>
		<button class="bulk-update-btn" id="bulkUpdateBtn" onclick="openBulkUpdateDialog()">Update All Matching</button>
	</div>
	<div class="package-count" id="packageCount"></div>
	<div class="package-list" id="packageList"></div>

	<script>
		const vscode = acquireVsCodeApi();
		let allPackages = ${packagesJson};
		let filteredPackages = allPackages;

		function renderPackages(packages) {
			filteredPackages = packages;
			updateBulkUpdateButton();
			
			const packageList = document.getElementById('packageList');
			const packageCount = document.getElementById('packageCount');
			
			if (packages.length === 0) {
				packageList.innerHTML = '<div class="no-results">No packages found</div>';
				packageCount.textContent = '';
				return;
			}

			packageCount.textContent = \`Showing \${packages.length} package\${packages.length !== 1 ? 's' : ''}\`;
			
			packages = packages.sort((a, b) => a.name.localeCompare(b.name));

			packageList.innerHTML = packages.map(pkg => {
				// Check if package has version conflicts
				const versions = pkg.consumers.map(c => c.version);
				const hasVersionConflict = new Set(versions).size > 1;
				
				return \`
					<div class="package-item">
						<div class="package-name">\${pkg.name}</div>
						\${pkg.consumers.map((consumer, index) => \`
							<div class="consumer-item \${hasVersionConflict ? 'version-conflict' : ''}" 
							     data-package="\${pkg.name}" 
							     data-version="\${consumer.version}" 
							     data-project="\${consumer.projectFile}">
								\${consumer.version} - \${consumer.projectFile}
								\${hasVersionConflict ? '<div class="tooltip">Inconsistent versions detected, click to choose this version in all listed projects</div>' : ''}
							</div>
						\`).join('')}
					</div>
				\`;
			}).join('');
			
			// Add click handlers for version conflicts
			document.querySelectorAll('.version-conflict').forEach(element => {
				element.addEventListener('click', handleVersionConflictClick);
			});
		}

		// Initial render
		renderPackages(allPackages);

		function handleVersionConflictClick(event) {
			const element = event.currentTarget;
			const packageName = element.getAttribute('data-package');
			const selectedVersion = element.getAttribute('data-version');
			
			// Send message to extension to update versions
			vscode.postMessage({
				command: 'updatePackageVersions',
				packageName: packageName,
				targetVersion: selectedVersion
			});
		}

		// Search functionality
		const searchInput = document.getElementById('searchInput');
		searchInput.addEventListener('input', (e) => {
			const searchText = e.target.value.toLowerCase();
			
			if (!searchText) {
				renderPackages(allPackages);
				return;
			}
			
			const filtered = allPackages.filter(pkg => {
				// Check package name
				const nameMatches = pkg.name.toLowerCase().includes(searchText);
				
				// Check consumers
				const consumerMatches = pkg.consumers.some(consumer =>
					consumer.version.toLowerCase().includes(searchText)
				);
				
				return nameMatches || consumerMatches;
			});
			
			renderPackages(filtered);
		});

		function updateBulkUpdateButton() {
			const bulkUpdateBtn = document.getElementById('bulkUpdateBtn');
			bulkUpdateBtn.disabled = filteredPackages.length === 0;
			bulkUpdateBtn.textContent = filteredPackages.length === allPackages.length 
				? 'Update All Packages' 
				: \`Update \${filteredPackages.length} Matching\`;
		}

		function refreshPackages() {
			// Send message to extension to refresh package list
			vscode.postMessage({
				command: 'refreshPackageList'
			});
		}

		function openBulkUpdateDialog() {
			if (filteredPackages.length === 0) return;
			
			// Find the highest version among all filtered packages
			const allVersions = [];
			filteredPackages.forEach(pkg => {
				pkg.consumers.forEach(consumer => {
					allVersions.push(consumer.version);
				});
			});
			
			const highestVersion = findHighestVersion(allVersions);
			
			// Send message to open bulk update dialog
			vscode.postMessage({
				command: 'openBulkUpdate',
				packages: filteredPackages,
				suggestedVersion: highestVersion
			});
		}

		function findHighestVersion(versions) {
			// Simple version comparison - assumes semantic versioning
			return versions.sort((a, b) => {
				const aParts = a.split('.').map(n => parseInt(n) || 0);
				const bParts = b.split('.').map(n => parseInt(n) || 0);
				
				for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
					const aPart = aParts[i] || 0;
					const bPart = bParts[i] || 0;
					if (aPart !== bPart) {
						return bPart - aPart; // Descending order
					}
				}
				return 0;
			})[0];
		}

		// Listen for messages from extension
		window.addEventListener('message', event => {
			const message = event.data;
			switch (message.command) {
				case 'updateResults':
          			allPackages = message.packages;
					renderPackages(allPackages);
					break;

				case 'refreshPackages':
          			allPackages = message.packages;
					renderPackages(allPackages);
					break;
			}
		});
	</script>
</body>
</html>`;
}
