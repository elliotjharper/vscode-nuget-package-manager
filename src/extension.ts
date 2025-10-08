// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { showBulkUpdateDialog } from "./dialogs/show-bulk-update-dialog";
import { showUpdateConfirmation } from "./dialogs/show-update-confirmation";
import { filterPackages } from "./filter-packages";
import { getInstalledPackages } from "./get-installed-packages";
import { updatePackageVersions } from "./update-package-versions";
import { mainWebviewContent } from "./webviews/main-webview-content";

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
      panel.webview.html = mainWebviewContent(packageMap);

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

// This method is called when your extension is deactivated
export function deactivate() {}
