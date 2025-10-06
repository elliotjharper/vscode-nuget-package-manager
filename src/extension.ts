// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";

interface PackageConsumer {
  projectFile: string;
  version: string;
}

interface PackageInfo {
  name: string;
  consumers: PackageConsumer[];
}

interface PackageReference {
  name: string;
  version: string;
  projectFile: string;
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand(
    "elltg-nuget-package-manager.packageUpdate",
    async () => {
      // Create and show a new webview
      const panel = vscode.window.createWebviewPanel(
        "nugetPackageUpdate",
        "NuGet Package Update",
        vscode.ViewColumn.One,
        {
          enableScripts: true,
        }
      );

      // Get all installed packages
      let packageMap = await getInstalledPackages();

      // Set the webview content
      panel.webview.html = getWebviewContent(packageMap);

      const updateWebView = panel.webview;
      // Handle messages from the webview
      updateWebView.onDidReceiveMessage(
        async (message) => {
          switch (message.command) {
            case "search":
              const filtered = filterPackages(packageMap, message.text);
              updateWebView.postMessage({
                command: "updateResults",
                packages: Array.from(filtered.values()),
              });
              break;

            case "updatePackageVersions":
              const confirmed = await showUpdateConfirmation(
                message.packageName,
                message.targetVersion
              );
              if (confirmed) {
                await updatePackageVersions(
                  message.packageName,
                  message.targetVersion
                );
                // Refresh the package list
                packageMap = await getInstalledPackages();
                updateWebView.postMessage({
                  command: "refreshPackages",
                  packages: Array.from(packageMap.values()),
                });
              }
              break;

            case "openBulkUpdate":
              await showBulkUpdateDialog(
                message.packages,
                message.suggestedVersion
              );
              // setTimeout required to ensure that reads happen at the right time, weird behavior otherwise
              setTimeout(async () => {
                packageMap = await getInstalledPackages();

                updateWebView.postMessage({
                  command: "refreshPackages",
                  packages: Array.from(packageMap.values()),
                });
              }, 0);
              break;

            case "refreshPackageList":
              packageMap = await getInstalledPackages();
              updateWebView.postMessage({
                command: "refreshPackages",
                packages: Array.from(packageMap.values()),
              });
              break;
          }
        },
        undefined,
        context.subscriptions
      );
    }
  );

  context.subscriptions.push(disposable);
}

async function getInstalledPackages(): Promise<Map<string, PackageInfo>> {
  const packageMap = new Map<string, PackageInfo>();
  const workspaceFolders = vscode.workspace.workspaceFolders;

  if (!workspaceFolders) {
    vscode.window.showWarningMessage("No workspace folder is open");
    return packageMap;
  }

  for (const folder of workspaceFolders) {
    const csprojFiles = await findCsprojFiles(folder.uri.fsPath);

    for (const csprojFile of csprojFiles) {
      const projectPackages = await parseCsprojFile(csprojFile);

      // Aggregate packages into the map
      for (const pkg of projectPackages) {
        if (packageMap.has(pkg.name)) {
          // Add this consumer to existing package
          const existingPackage = packageMap.get(pkg.name)!;
          existingPackage.consumers.push({
            projectFile: pkg.projectFile,
            version: pkg.version,
          });
        } else {
          // Create new package entry
          packageMap.set(pkg.name, {
            name: pkg.name,
            consumers: [
              {
                projectFile: pkg.projectFile,
                version: pkg.version,
              },
            ],
          });
        }
      }
    }
  }

  return packageMap;
}

async function findCsprojFiles(dir: string): Promise<string[]> {
  const csprojFiles: string[] = [];

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      // Skip node_modules and other common directories
      if (
        entry.isDirectory() &&
        !["node_modules", "bin", "obj", ".git"].includes(entry.name)
      ) {
        const subFiles = await findCsprojFiles(fullPath);
        csprojFiles.push(...subFiles);
      } else if (entry.isFile() && entry.name.endsWith(".csproj")) {
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
    const content = fs.readFileSync(filePath, "utf-8");
    const projectName = path.basename(filePath);

    // Match PackageReference elements with Include and Version attributes
    // Handles both <PackageReference Include="..." Version="..." /> and separate attributes
    const packageRegex =
      /<PackageReference\s+Include="([^"]+)"[^>]*Version="([^"]+)"/g;
    let match;

    while ((match = packageRegex.exec(content)) !== null) {
      packages.push({
        name: match[1],
        version: match[2],
        projectFile: projectName,
      });
    }
  } catch (error) {
    console.error(`Error parsing csproj file ${filePath}:`, error);
  }

  return packages;
}

function filterPackages(
  packageMap: Map<string, PackageInfo>,
  searchText: string
): Map<string, PackageInfo> {
  if (!searchText) {
    return packageMap;
  }

  const filtered = new Map<string, PackageInfo>();
  const lowerSearch = searchText.toLowerCase();

  for (const [packageName, packageInfo] of packageMap) {
    // Check if package name matches
    const nameMatches = packageName.toLowerCase().includes(lowerSearch);

    // Check if any consumer's version matches
    const consumerMatches = packageInfo.consumers.some(
      (consumer) =>
        consumer.version.toLowerCase().includes(lowerSearch)
    );

    if (nameMatches || consumerMatches) {
      filtered.set(packageName, packageInfo);
    }
  }

  return filtered;
}

async function showUpdateConfirmation(
  packageName: string,
  targetVersion: string
): Promise<boolean> {
  const workspaceFolders = vscode.workspace.workspaceFolders;

  if (!workspaceFolders) {
    return false;
  }

  // Find all projects that currently use this package
  const affectedProjects: { project: string; currentVersion: string }[] = [];

  for (const folder of workspaceFolders) {
    const csprojFiles = await findCsprojFiles(folder.uri.fsPath);

    for (const csprojFile of csprojFiles) {
      const packages = await parseCsprojFile(csprojFile);
      const packageInfo = packages.find((pkg) => pkg.name === packageName);

      if (packageInfo && packageInfo.version !== targetVersion) {
        affectedProjects.push({
          project: path.basename(packageInfo.projectFile),
          currentVersion: packageInfo.version,
        });
      }
    }
  }

  if (affectedProjects.length === 0) {
    vscode.window.showInformationMessage(
      "All projects are already using the selected version."
    );
    return false;
  }

  // Always use custom webview dialog for consistency
  return new Promise<boolean>((resolve) => {
    const panel = vscode.window.createWebviewPanel(
      "confirmUpdate",
      "Confirm Package Update",
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    panel.webview.html = getConfirmationWebviewContent(
      packageName,
      targetVersion,
      affectedProjects
    );

    let resolved = false;

    panel.webview.onDidReceiveMessage((message) => {
      resolved = true;
      resolve(message.command === "confirm");
      panel.dispose();
    });

    panel.onDidDispose(() => {
      if (!resolved) {
        resolve(false);
      }
    });
  });
}

function getConfirmationWebviewContent(
  packageName: string,
  targetVersion: string,
  affectedProjects: { project: string; currentVersion: string }[]
): string {
  const projectListHtml = affectedProjects
    .map(
      (p) => `
      <div class="project-item">
        <span class="project-name">${p.project}</span>
        <span class="version-change">${p.currentVersion} → ${targetVersion}</span>
      </div>
    `
    )
    .join("");

  return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Confirm Package Update</title>
        <style>
            body {
                font-family: var(--vscode-font-family);
                font-size: var(--vscode-font-size);
                color: var(--vscode-foreground);
                background-color: var(--vscode-editor-background);
                margin: 0;
                padding: 20px;
            }
            .header {
                margin-bottom: 20px;
            }
            .package-info {
                font-size: 16px;
                font-weight: bold;
                margin-bottom: 10px;
            }
            .description {
                margin-bottom: 20px;
                color: var(--vscode-descriptionForeground);
            }
            .project-list {
                max-height: 300px;
                overflow-y: auto;
                border: 1px solid var(--vscode-panel-border);
                border-radius: 4px;
                padding: 10px;
                margin-bottom: 20px;
                background-color: var(--vscode-editor-background);
            }
            .project-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 0;
                border-bottom: 1px solid var(--vscode-panel-border);
            }
            .project-item:last-child {
                border-bottom: none;
            }
            .project-name {
                font-weight: 500;
            }
            .version-change {
                color: var(--vscode-descriptionForeground);
                font-family: monospace;
            }
            .buttons {
                display: flex;
                gap: 10px;
                justify-content: flex-end;
            }
            .button {
                padding: 8px 16px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
            }
            .button-primary {
                background-color: var(--vscode-button-background);
                color: var(--vscode-button-foreground);
            }
            .button-primary:hover {
                background-color: var(--vscode-button-hoverBackground);
            }
            .button-secondary {
                background-color: var(--vscode-button-secondaryBackground);
                color: var(--vscode-button-secondaryForeground);
            }
            .button-secondary:hover {
                background-color: var(--vscode-button-secondaryHoverBackground);
            }
            .project-count {
                font-size: 14px;
                color: var(--vscode-descriptionForeground);
                margin-bottom: 10px;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="package-info">Update ${packageName} to version ${targetVersion}</div>
            <div class="description">The following projects will be updated:</div>
            <div class="project-count">${affectedProjects.length} project${
    affectedProjects.length !== 1 ? "s" : ""
  } affected</div>
        </div>
        
        <div class="project-list">
            ${projectListHtml}
        </div>
        
        <div class="buttons">
            <button class="button button-secondary" onclick="cancel()">Cancel</button>
            <button class="button button-primary" onclick="confirm()">Update All</button>
        </div>

        <script>
            const vscode = acquireVsCodeApi();
            
            function confirm() {
                vscode.postMessage({ command: 'confirm' });
            }
            
            function cancel() {
                vscode.postMessage({ command: 'cancel' });
            }
        </script>
    </body>
    </html>`;
}

async function showBulkUpdateDialog(
  packages: PackageInfo[],
  suggestedVersion: string
): Promise<void> {
  return new Promise<void>((resolve) => {
    const panel = vscode.window.createWebviewPanel(
      "bulkUpdate",
      "Bulk Update Packages",
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    panel.webview.html = getBulkUpdateWebviewContent(
      packages,
      suggestedVersion
    );

    panel.webview.onDidReceiveMessage(async (message) => {
      if (message.command === "bulkUpdate") {
        await processBulkUpdate(packages, message.targetVersion);
      }
      panel.dispose();
    });

    panel.onDidDispose(() => {
      resolve();
    });
  });
}

function getBulkUpdateWebviewContent(
  packages: PackageInfo[],
  suggestedVersion: string
): string {
  const packageListHtml = packages
    .map(
      (pkg) => `
      <div class="package-item">
        <span class="package-name">${pkg.name}</span>
        <span class="consumer-count">${pkg.consumers.length} project${
        pkg.consumers.length !== 1 ? "s" : ""
      }</span>
      </div>
    `
    )
    .join("");

  return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Bulk Update Packages</title>
        <style>
            body {
                font-family: var(--vscode-font-family);
                font-size: var(--vscode-font-size);
                color: var(--vscode-foreground);
                background-color: var(--vscode-editor-background);
                margin: 0;
                padding: 20px;
            }
            .header {
                margin-bottom: 20px;
            }
            .title {
                font-size: 18px;
                font-weight: bold;
                margin-bottom: 10px;
            }
            .description {
                margin-bottom: 20px;
                color: var(--vscode-descriptionForeground);
            }
            .version-input-container {
                margin-bottom: 20px;
            }
            .version-input-container label {
                display: block;
                margin-bottom: 5px;
                font-weight: 500;
            }
            #versionInput {
                width: 200px;
                padding: 8px;
                border: 1px solid var(--vscode-input-border);
                background-color: var(--vscode-input-background);
                color: var(--vscode-input-foreground);
                border-radius: 4px;
                font-size: 14px;
            }
            .package-list {
                max-height: 300px;
                overflow-y: auto;
                border: 1px solid var(--vscode-panel-border);
                border-radius: 4px;
                padding: 10px;
                margin-bottom: 20px;
                background-color: var(--vscode-editor-background);
            }
            .package-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 0;
                border-bottom: 1px solid var(--vscode-panel-border);
            }
            .package-item:last-child {
                border-bottom: none;
            }
            .package-name {
                font-weight: 500;
            }
            .consumer-count {
                color: var(--vscode-descriptionForeground);
                font-size: 12px;
            }
            .buttons {
                display: flex;
                gap: 10px;
                justify-content: flex-end;
            }
            .button {
                padding: 8px 16px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
            }
            .button-primary {
                background-color: var(--vscode-button-background);
                color: var(--vscode-button-foreground);
            }
            .button-primary:hover {
                background-color: var(--vscode-button-hoverBackground);
            }
            .button-secondary {
                background-color: var(--vscode-button-secondaryBackground);
                color: var(--vscode-button-secondaryForeground);
            }
            .button-secondary:hover {
                background-color: var(--vscode-button-secondaryHoverBackground);
            }
            .package-count {
                font-size: 14px;
                color: var(--vscode-descriptionForeground);
                margin-bottom: 10px;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="title">Bulk Update Packages</div>
            <div class="description">Update all selected packages to the same version across all projects.</div>
            <div class="package-count">${packages.length} package${
    packages.length !== 1 ? "s" : ""
  } selected</div>
        </div>
        
        <div class="version-input-container">
            <label for="versionInput">Target Version:</label>
            <input type="text" id="versionInput" value="${suggestedVersion}" placeholder="e.g., 1.2.3" />
        </div>
        
        <div class="package-list">
            ${packageListHtml}
        </div>
        
        <div class="buttons">
            <button class="button button-secondary" onclick="cancel()">Cancel</button>
            <button class="button button-primary" onclick="bulkUpdate()">Update All</button>
        </div>

        <script>
            const vscode = acquireVsCodeApi();
            
            function bulkUpdate() {
                const version = document.getElementById('versionInput').value.trim();
                if (!version) {
                    alert('Please enter a version number');
                    return;
                }
                vscode.postMessage({ 
                    command: 'bulkUpdate', 
                    targetVersion: version 
                });
            }
            
            function cancel() {
                vscode.postMessage({ command: 'cancel' });
            }
            
            // Focus the version input
            document.getElementById('versionInput').focus();
            document.getElementById('versionInput').select();
            
            // Add Enter key listener to version input
            document.getElementById('versionInput').addEventListener('keydown', function(event) {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    bulkUpdate();
                }

                if (event.key === 'Escape' || event.key === 'Esc') {
                    event.preventDefault();
                    cancel();
                }
            });
        </script>
    </body>
    </html>`;
}

async function processBulkUpdate(
  packages: PackageInfo[],
  targetVersion: string
): Promise<void> {
  const workspaceFolders = vscode.workspace.workspaceFolders;

  if (!workspaceFolders) {
    vscode.window.showErrorMessage("No workspace folder is open");
    return;
  }

  try {
    // Count total packages to update
    const packageNames = packages.map((pkg) => pkg.name);

    for (const folder of workspaceFolders) {
      const csprojFiles = await findCsprojFiles(folder.uri.fsPath);

      for (const csprojFile of csprojFiles) {
        for (const packageName of packageNames) {
          await updatePackageVersionInFile(
            csprojFile,
            packageName,
            targetVersion
          );
        }
      }
    }

    vscode.window.showInformationMessage(
      `Updated ${packageNames.length} packages to version ${targetVersion} across all projects`
    );
  } catch (error) {
    vscode.window.showErrorMessage(
      `Failed to update package versions: ${error}`
    );
  }
}

async function updatePackageVersions(
  packageName: string,
  targetVersion: string
): Promise<void> {
  const workspaceFolders = vscode.workspace.workspaceFolders;

  if (!workspaceFolders) {
    vscode.window.showErrorMessage("No workspace folder is open");
    return;
  }

  try {
    for (const folder of workspaceFolders) {
      const csprojFiles = await findCsprojFiles(folder.uri.fsPath);

      for (const csprojFile of csprojFiles) {
        await updatePackageVersionInFile(
          csprojFile,
          packageName,
          targetVersion
        );
      }
    }

    vscode.window.showInformationMessage(
      `Updated ${packageName} to version ${targetVersion} in all projects`
    );
  } catch (error) {
    vscode.window.showErrorMessage(
      `Failed to update package versions: ${error}`
    );
  }
}

async function updatePackageVersionInFile(
  filePath: string,
  packageName: string,
  targetVersion: string
): Promise<void> {
  try {
    let content = fs.readFileSync(filePath, "utf-8");

    // Create regex to find the specific package reference
    const packageRegex = new RegExp(
      `(<PackageReference\\s+Include="${packageName.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      )}"[^>]*Version=")([^"]+)(")`,
      "g"
    );

    // Replace the version if the package is found
    const updatedContent = content.replace(
      packageRegex,
      `$1${targetVersion}$3`
    );

    // Only write if content changed
    if (updatedContent !== content) {
      fs.writeFileSync(filePath, updatedContent, "utf-8");
    }
  } catch (error) {
    console.error(`Error updating package version in ${filePath}:`, error);
    throw error;
  }
}

function getWebviewContent(packageMap: Map<string, PackageInfo>): string {
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

// This method is called when your extension is deactivated
export function deactivate() {}
