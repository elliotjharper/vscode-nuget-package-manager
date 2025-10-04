// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

interface PackageReference {
	name: string;
	version: string;
	projectFile: string;
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	console.log('NuGet Package Manager extension is now active!');

	const disposable = vscode.commands.registerCommand('nuget-package-manager.packageUpdate', async () => {
		const panel = vscode.window.createWebviewPanel(
			'nugetPackageUpdate',
			'NuGet Package Update',
			vscode.ViewColumn.One,
			{
				enableScripts: true
			}
		);

		// Get all installed packages
		const packages = await getInstalledPackages();
		
		// Set the webview content
		panel.webview.html = getWebviewContent(packages);

		// Handle messages from the webview
		panel.webview.onDidReceiveMessage(
			message => {
				switch (message.command) {
					case 'search':
						const filtered = filterPackages(packages, message.text);
						panel.webview.postMessage({ command: 'updateResults', packages: filtered });
						break;
				}
			},
			undefined,
			context.subscriptions
		);
	});

	context.subscriptions.push(disposable);
}

async function getInstalledPackages(): Promise<PackageReference[]> {
	const packages: PackageReference[] = [];
	const workspaceFolders = vscode.workspace.workspaceFolders;

	if (!workspaceFolders) {
		vscode.window.showWarningMessage('No workspace folder is open');
		return packages;
	}

	for (const folder of workspaceFolders) {
		const csprojFiles = await findCsprojFiles(folder.uri.fsPath);
		
		for (const csprojFile of csprojFiles) {
			const projectPackages = await parseCsprojFile(csprojFile);
			packages.push(...projectPackages);
		}
	}

	return packages;
}

async function findCsprojFiles(dir: string): Promise<string[]> {
	const csprojFiles: string[] = [];
	
	try {
		const entries = fs.readdirSync(dir, { withFileTypes: true });
		
		for (const entry of entries) {
			const fullPath = path.join(dir, entry.name);
			
			// Skip node_modules and other common directories
			if (entry.isDirectory() && !['node_modules', 'bin', 'obj', '.git'].includes(entry.name)) {
				const subFiles = await findCsprojFiles(fullPath);
				csprojFiles.push(...subFiles);
			} else if (entry.isFile() && entry.name.endsWith('.csproj')) {
				csprojFiles.push(fullPath);
			}
		}
	} catch (error) {
		console.error(`Error reading directory ${dir}:`, error);
	}
	
	return csprojFiles;
}

async function parseCsprojFile(filePath: string): Promise<PackageReference[]> {
	const packages: PackageReference[] = [];
	
	try {
		const content = fs.readFileSync(filePath, 'utf-8');
		const projectName = path.basename(filePath);
		
		// Match PackageReference elements with Include and Version attributes
		// Handles both <PackageReference Include="..." Version="..." /> and separate attributes
		const packageRegex = /<PackageReference\s+Include="([^"]+)"[^>]*Version="([^"]+)"/g;
		let match;
		
		while ((match = packageRegex.exec(content)) !== null) {
			packages.push({
				name: match[1],
				version: match[2],
				projectFile: projectName
			});
		}
	} catch (error) {
		console.error(`Error parsing csproj file ${filePath}:`, error);
	}
	
	return packages;
}

function filterPackages(packages: PackageReference[], searchText: string): PackageReference[] {
	if (!searchText) {
		return packages;
	}
	
	const lowerSearch = searchText.toLowerCase();
	return packages.filter(pkg => 
		pkg.name.toLowerCase().includes(lowerSearch) ||
		pkg.version.toLowerCase().includes(lowerSearch) ||
		pkg.projectFile.toLowerCase().includes(lowerSearch)
	);
}

function getWebviewContent(packages: PackageReference[]): string {
	const packagesJson = JSON.stringify(packages);
	
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
		}
		#searchInput {
			width: 100%;
			padding: 8px;
			font-size: 14px;
			background-color: var(--vscode-input-background);
			color: var(--vscode-input-foreground);
			border: 1px solid var(--vscode-input-border);
			border-radius: 2px;
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
			margin-bottom: 4px;
		}
		.package-version {
			color: var(--vscode-descriptionForeground);
			font-size: 14px;
		}
		.package-project {
			color: var(--vscode-descriptionForeground);
			font-size: 12px;
			margin-top: 4px;
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
	</div>
	<div class="package-count" id="packageCount"></div>
	<div class="package-list" id="packageList"></div>

	<script>
		const vscode = acquireVsCodeApi();
		let allPackages = ${packagesJson};

		function renderPackages(packages) {
			const packageList = document.getElementById('packageList');
			const packageCount = document.getElementById('packageCount');
			
			if (packages.length === 0) {
				packageList.innerHTML = '<div class="no-results">No packages found</div>';
				packageCount.textContent = '';
				return;
			}

			packageCount.textContent = \`Showing \${packages.length} package\${packages.length !== 1 ? 's' : ''}\`;
			
			packageList.innerHTML = packages.map(pkg => \`
				<div class="package-item">
					<div class="package-name">\${pkg.name}</div>
					<div class="package-version">Version: \${pkg.version}</div>
					<div class="package-project">Project: \${pkg.projectFile}</div>
				</div>
			\`).join('');
		}

		// Initial render
		renderPackages(allPackages);

		// Search functionality
		const searchInput = document.getElementById('searchInput');
		searchInput.addEventListener('input', (e) => {
			const searchText = e.target.value.toLowerCase();
			
			if (!searchText) {
				renderPackages(allPackages);
				return;
			}
			
			const filtered = allPackages.filter(pkg => 
				pkg.name.toLowerCase().includes(searchText) ||
				pkg.version.toLowerCase().includes(searchText) ||
				pkg.projectFile.toLowerCase().includes(searchText)
			);
			
			renderPackages(filtered);
		});

		// Listen for messages from extension
		window.addEventListener('message', event => {
			const message = event.data;
			switch (message.command) {
				case 'updateResults':
					renderPackages(message.packages);
					break;
			}
		});
	</script>
</body>
</html>`;
}

// This method is called when your extension is deactivated
export function deactivate() {}
