import * as vscode from "vscode";
import { getAvailableVersions } from "../fetch-package-versions";
import { processBulkUpdate } from "../process-bulk-update";
import { PackageInfo } from "../types";
import { bulkUpdateWebviewContent } from "../webviews/bulk-update-webview-content";

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

    // Fetch available versions for the first package to populate dropdown
    let availableVersions: string[] = [];
    if (packages.length > 0) {
      getAvailableVersions(packages[0].name)
        .then((versions) => {
          availableVersions = versions.map((v) => v.version);
          panel.webview.postMessage({
            command: "updateVersions",
            versions: availableVersions,
          });
        })
        .catch((error) => {
          console.error("Error fetching available versions:", error);
          // Continue with empty versions array
          panel.webview.postMessage({
            command: "updateVersions",
            versions: [],
          });
        });
    }

    panel.webview.html = bulkUpdateWebviewContent(
      packages,
      suggestedVersion,
      availableVersions
    );

    panel.webview.onDidReceiveMessage(async (message) => {
      if (message.command === "bulkUpdate") {
        await processBulkUpdate(packages, message.targetVersion);
        panel.dispose();
      } else if (message.command === "refreshVersions") {
        // Refresh available versions for the first package
        if (packages.length > 0) {
          try {
            const versions = await getAvailableVersions(packages[0].name);
            availableVersions = versions.map((v) => v.version);
            panel.webview.postMessage({
              command: "updateVersions",
              versions: availableVersions,
            });
          } catch (error) {
            console.error("Error fetching available versions:", error);
            vscode.window.showErrorMessage(
              `Failed to fetch versions for ${packages[0].name}: ${
                error instanceof Error ? error.message : "Unknown error"
              }`
            );
          }
        }
      } else if (message.command === "cancel") {
        panel.dispose();
      }
    });

    panel.onDidDispose(() => {
      resolve();
    });
  });
}
