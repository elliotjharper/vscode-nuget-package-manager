import * as vscode from "vscode";
import { findCsprojFiles } from "./find-csproj-files";
import { parseCsprojFile } from "./parse-csproj-file";
import { PackageInfo } from "./types";

export async function getInstalledPackages(): Promise<
    Map<string, PackageInfo>
> {
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
