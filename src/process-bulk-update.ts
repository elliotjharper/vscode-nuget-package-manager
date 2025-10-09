import * as vscode from "vscode";
import { findCsprojFiles } from "./find-csproj-files";
import { PackageInfo } from "./types";
import { updatePackageVersionInFile } from "./update-package-version-in-file";

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
