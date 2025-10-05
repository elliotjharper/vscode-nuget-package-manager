# NuGet Package Manager for VSCode

A Visual Studio Code extension for managing NuGet packages in your .NET projects.

## Features

- **NuGet Package Update**: View and search through all installed NuGet packages across your workspace
  - Automatically discovers all `.csproj` files in your workspace
  - **Groups packages by name** - shows each unique package once with all its consumers
  - Displays package name and for each consumer: version and source project
  - Shows when the same package is used by multiple projects (potentially with different versions)
  - **Highlights version conflicts in red** when the same package has different versions across projects
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

## Release Notes

### 0.0.1

Initial release:

- View all installed NuGet packages from `.csproj` files
- **Smart package grouping**: Shows each package once with all consuming projects
- Displays multiple consumers per package with their respective versions
- Support for packages used across multiple projects with different versions
- **Version conflict highlighting**: Highlights packages in red when different versions are used across projects
- Search and filter packages by name, version, or project
