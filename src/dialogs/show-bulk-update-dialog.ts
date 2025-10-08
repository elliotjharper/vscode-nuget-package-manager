import * as vscode from "vscode";
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

    panel.webview.html = bulkUpdateWebviewContent(packages, suggestedVersion);

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
