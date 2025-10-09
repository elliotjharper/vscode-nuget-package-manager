import { PackageInfo } from "../types";

export function bulkUpdateWebviewContent(
    packages: PackageInfo[],
    suggestedVersion: string,
    availableVersions: string[] = []
): string {
    const packageListHtml = packages
        .map(
            (pkg) => `
      <div class="package-item">
        <span class="package-name">${pkg.name}</span>
        <span class="consumer-count">${pkg.consumers.length} project${
                pkg.consumers.length !== 1 ? "s" : ""
            }</span>
      </div>
    `
        )
        .join("");

    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Bulk Update Packages</title>
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
            .title {
                font-size: 18px;
                font-weight: bold;
                margin-bottom: 10px;
            }
            .description {
                margin-bottom: 20px;
                color: var(--vscode-descriptionForeground);
            }
            .version-input-container {
                margin-bottom: 20px;
            }
            .version-input-container label {
                display: block;
                margin-bottom: 5px;
                font-weight: 500;
            }
            .version-input-group {
                display: flex;
                align-items: center;
                flex-wrap: wrap;
                gap: 10px;
            }
            #versionInput {
                min-width: 200px;
                padding: 8px;
                border: 1px solid var(--vscode-input-border);
                background-color: var(--vscode-input-background);
                color: var(--vscode-input-foreground);
                border-radius: 4px;
                font-size: 14px;
            }
            #versionSelect {
                min-width: 150px;
                padding: 8px;
                border: 1px solid var(--vscode-input-border);
                background-color: var(--vscode-input-background);
                color: var(--vscode-input-foreground);
                border-radius: 4px;
                font-size: 14px;
            }
            .package-list {
                max-height: 300px;
                overflow-y: auto;
                border: 1px solid var(--vscode-panel-border);
                border-radius: 4px;
                padding: 10px;
                margin-bottom: 20px;
                background-color: var(--vscode-editor-background);
            }
            .package-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 0;
                border-bottom: 1px solid var(--vscode-panel-border);
            }
            .package-item:last-child {
                border-bottom: none;
            }
            .package-name {
                font-weight: 500;
            }
            .consumer-count {
                color: var(--vscode-descriptionForeground);
                font-size: 12px;
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
            .package-count {
                font-size: 14px;
                color: var(--vscode-descriptionForeground);
                margin-bottom: 10px;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="title">Bulk Update Packages</div>
            <div class="description">Update all selected packages to the same version across all projects.</div>
            <div class="package-count">${packages.length} package${
        packages.length !== 1 ? "s" : ""
    } selected</div>
        </div>

        <div class="version-input-container">
            <label for="versionInput">Target Version:</label>
            <div class="version-input-group">
                <input type="text" id="versionInput" value="${suggestedVersion}" placeholder="e.g., 1.2.3" />
                <select id="versionSelect" style="margin-left: 10px; padding: 8px; border: 1px solid var(--vscode-input-border); background-color: var(--vscode-input-background); color: var(--vscode-input-foreground); border-radius: 4px;">
                    <option value="">Select version...</option>
                </select>
                <button id="refreshVersions" class="button button-secondary" style="margin-left: 10px; padding: 8px 12px; font-size: 12px;">Refresh</button>
            </div>
        </div>

        <div class="package-list">
            ${packageListHtml}
        </div>

        <div class="buttons">
            <button class="button button-secondary" onclick="cancel()">Cancel</button>
            <button class="button button-primary" onclick="bulkUpdate()">Update All</button>
        </div>

        <script>
            const vscode = acquireVsCodeApi();

            function bulkUpdate() {
                const version = document.getElementById('versionInput').value.trim();
                if (!version) {
                    alert('Please enter a version number');
                    return;
                }
                vscode.postMessage({
                    command: 'bulkUpdate',
                    targetVersion: version
                });
            }

            function cancel() {
                vscode.postMessage({ command: 'cancel' });
            }

            function refreshVersions() {
                vscode.postMessage({ command: 'refreshVersions' });
            }

            function populateVersions(versions) {
                const select = document.getElementById('versionSelect');
                select.innerHTML = '<option value="">Select version...</option>';

                versions.forEach(version => {
                    const option = document.createElement('option');
                    option.value = version;
                    option.textContent = version;
                    select.appendChild(option);
                });
            }

            // Handle version selection from dropdown
            document.getElementById('versionSelect').addEventListener('change', function(event) {
                const selectedVersion = event.target.value;
                if (selectedVersion) {
                    document.getElementById('versionInput').value = selectedVersion;
                }
            });

            // Handle refresh button
            document.getElementById('refreshVersions').addEventListener('click', refreshVersions);

            // Listen for messages from extension
            window.addEventListener('message', event => {
                const message = event.data;
                switch (message.command) {
                    case 'updateVersions':
                        populateVersions(message.versions);
                        break;
                }
            });

            // Focus the version input
            document.getElementById('versionInput').focus();
            document.getElementById('versionInput').select();

            // Add Enter key listener to version input
            document.getElementById('versionInput').addEventListener('keydown', function(event) {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    bulkUpdate();
                }

                if (event.key === 'Escape' || event.key === 'Esc') {
                    event.preventDefault();
                    cancel();
                }
            });

            // Initialize with available versions
            populateVersions(${JSON.stringify(availableVersions)});
        </script>
    </body>
    </html>`;
}
