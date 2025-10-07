// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { PackageConsumer, PackageInfo, PackageReference } from "./types";
import {
  getWebviewContent,
  getConfirmationWebviewContent,
} from "./webviewTemplates";
import { showBulkUpdateDialog } from "./bulkUpdate";

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

// This method is called when your extension is deactivated
export function deactivate() {}
