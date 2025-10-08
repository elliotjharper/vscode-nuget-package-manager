import * as vscode from "vscode";
import { findCsprojFiles } from "./find-csproj-files";
import { updatePackageVersionInFile } from "./update-package-version-in-file";

export async function updatePackageVersions(
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
