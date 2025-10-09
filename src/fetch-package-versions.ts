import { exec } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { promisify } from "util";
import * as vscode from "vscode";

const execAsync = promisify(exec);

interface PackageVersion {
    version: string;
    listed?: boolean;
}

/**
 * Finds the nuget.config file by searching up the directory tree from workspace folders
 */
export async function findNuGetConfigPath(): Promise<string | null> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        return null;
    }

    // Search in each workspace folder and their parent directories
    for (const folder of workspaceFolders) {
        let currentDir = folder.uri.fsPath;

        // Search up the directory tree
        while (currentDir !== path.dirname(currentDir)) {
            const nugetConfigPath = path.join(currentDir, "nuget.config");
            if (fs.existsSync(nugetConfigPath)) {
                return nugetConfigPath;
            }
            currentDir = path.dirname(currentDir);
        }
    }

    return null;
}
/**
 * Reads the nuget.config file and extracts package source URLs
 */

/**
 * Fetches available versions for a package using NuGet CLI
 */
export async function fetchPackageVersions(
    packageName: string
): Promise<PackageVersion[]> {
    try {
        const nugetConfigPath = await findNuGetConfigPath();

        // Determine the working directory (where nuget.config is located or workspace root)
        let workingDirectory: string;
        if (nugetConfigPath) {
            workingDirectory = path.dirname(nugetConfigPath);
        } else {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0) {
                throw new Error("No workspace folder found");
            }
            workingDirectory = workspaceFolders[0].uri.fsPath;
        }

        // Execute nuget list command
        const command = `nuget list "${packageName}" -AllVersions -Prerelease`;
        const { stdout, stderr } = await execAsync(command, {
            cwd: workingDirectory,
            timeout: 30000, // 30 second timeout
        });

        if (stderr && !stderr.includes("WARNING")) {
            console.error(`NuGet CLI stderr: ${stderr}`);
        }

        // Parse the output
        const versions: PackageVersion[] = [];
        const lines = stdout
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line);

        for (const line of lines) {
            // NuGet list output format: "PackageName Version"
            const match = line.match(/^(.+?)\s+([^\s]+)$/);
            if (match) {
                const [, name, version] = match;
                // Check if this line is for our target package (case-insensitive)
                if (name.toLowerCase() === packageName.toLowerCase()) {
                    versions.push({
                        version: version,
                        listed: true,
                    });
                }
            }
        }

        // Sort versions in descending order (newest first)
        versions.sort((a, b) => {
            try {
                return compareVersions(b.version, a.version);
            } catch {
                return b.version.localeCompare(a.version);
            }
        });

        return versions;
    } catch (error) {
        console.error(
            `Error fetching versions for package ${packageName}:`,
            error
        );

        // If NuGet CLI fails, check if it's a command not found error
        if (error instanceof Error) {
            if (
                error.message.includes("nuget") &&
                (error.message.includes("not found") ||
                    error.message.includes("not recognized"))
            ) {
                vscode.window.showErrorMessage(
                    "NuGet CLI not found. Please install NuGet CLI and ensure it's in your PATH."
                );
            } else {
                vscode.window.showErrorMessage(
                    `Failed to fetch package versions: ${error.message}`
                );
            }
        }

        return [];
    }
}

/**
 * Simple version comparison function
 */
function compareVersions(a: string, b: string): number {
    const aParts = a.split(".").map((part) => {
        const numPart = part.split("-")[0]; // Handle pre-release versions
        return parseInt(numPart, 10) || 0;
    });
    const bParts = b.split(".").map((part) => {
        const numPart = part.split("-")[0]; // Handle pre-release versions
        return parseInt(numPart, 10) || 0;
    });

    const maxLength = Math.max(aParts.length, bParts.length);

    for (let i = 0; i < maxLength; i++) {
        const aPart = aParts[i] || 0;
        const bPart = bParts[i] || 0;

        if (aPart > bPart) {
            return 1;
        }
        if (aPart < bPart) {
            return -1;
        }
    }

    return 0;
}

/**
 * Fetches available versions for a package using NuGet CLI
 * This function now uses the NuGet CLI which handles authentication and
 * source resolution automatically based on nuget.config
 */
export async function getAvailableVersions(
    packageName: string
): Promise<PackageVersion[]> {
    return await fetchPackageVersions(packageName);
}
