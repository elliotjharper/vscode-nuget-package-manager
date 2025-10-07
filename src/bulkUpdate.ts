import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { PackageInfo } from "./types";
import { getBulkUpdateWebviewContent } from "./webviewTemplates";

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

export async function showBulkUpdateDialog(
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

export async function processBulkUpdate(
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
