export function confirmationWebviewContent(
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
