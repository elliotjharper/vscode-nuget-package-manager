# NuGet Package Manager for VSCode

A Visual Studio Code extension for managing NuGet packages in your .NET projects.

## Features

- **NuGet Package Update**: View and search through all installed NuGet packages across your workspace
  - Automatically discovers all `.csproj` files in your workspace
  - Displays package name, version, and source project
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
- Search and filter packages by name, version, or project

