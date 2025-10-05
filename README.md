# NuGet Package Manager for VSCode

A Visual Studio Code extension for managing NuGet packages in your .NET projects.

## Features

- **NuGet Package Update**: View and search through all installed NuGet packages across your workspace
  - Automatically discovers all `.csproj` files in your workspace
  - **Groups packages by name** - shows each unique package once with all its consumers
  - Displays package name and for each consumer: version and source project
  - Shows when the same package is used by multiple projects (potentially with different versions)
  - **Highlights version conflicts in red** when the same package has different versions across projects
  - **Interactive version resolution**: Click on any conflicted version to standardize that version across all projects
  - **Bulk package updates**: Update all matching packages (from search filter) to a chosen version across all projects
  - **Consistent confirmation dialogs**: Custom webview dialogs with scrollable project lists for all confirmations
  - Real-time search filtering across package names, versions, and projects

## Usage

1. Open a workspace containing .NET projects with `.csproj` files
2. Open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)
3. Run the command: `NuGet: Package Update`
4. Browse and search through your installed packages

## Requirements

- Visual Studio Code 1.104.0 or higher
- A workspace with .NET project files (`.csproj`)

## Extension Settings

This extension does not currently contribute any settings.

## Development

This extension is developed using TypeScript and Webpack. See `IMPLEMENTATION.md` for technical details.

**Note for AI agents**: Do not create `TESTING.md` or `UI_MOCKUP.md` or `IMPLEMENATION.md` files - these have been intentionally removed and should not be recreated.

## Release Notes

### 0.0.3

Bulk package update functionality:

- **Bulk package updates**: "Update All Matching" button to update multiple packages at once
- **Smart version suggestions**: Pre-populates with the highest version found among selected packages
- **Filtered updates**: Works with search results - update only packages that match your search
- **Version input dialog**: Custom webview for entering target version with package list preview

### 0.0.2

Enhanced version conflict resolution:

- **Consistent confirmation dialogs**: Custom webview dialogs with scrollable project lists for all confirmations
- **Interactive version resolution**: Click on any conflicted version to standardize that version across all projects
- **Version conflict highlighting**: Highlights packages in red when different versions are used across projects

### 0.0.1

Initial release:

- View all installed NuGet packages from `.csproj` files
- **Smart package grouping**: Shows each package once with all consuming projects
- Displays multiple consumers per package with their respective versions
- Support for packages used across multiple projects with different versions
- **Version conflict highlighting**: Highlights packages in red when different versions are used across projects
- **Interactive version resolution**: Click on any version to update all projects to use that version
- Search and filter packages by name, version, or project
