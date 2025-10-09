import * as path from "path";
import * as vscode from "vscode";
import { findCsprojFiles } from "../find-csproj-files";
import { parseCsprojFile } from "../parse-csproj-file";
import { confirmationWebviewContent } from "../webviews/confirmation-webview-content";

export async function showUpdateConfirmation(
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
            const packageInfo = packages.find(
                (pkg) => pkg.name === packageName
            );

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

        panel.webview.html = confirmationWebviewContent(
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
