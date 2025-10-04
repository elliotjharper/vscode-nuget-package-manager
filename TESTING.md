# Manual Testing Guide

## Testing the NuGet Package Update Extension

### Prerequisites
1. Build the extension: `npm run compile`
2. Open the extension in VS Code
3. Press F5 to launch the Extension Development Host

### Test Scenarios

#### Scenario 1: Extension loads without errors
- **Expected**: Extension activates successfully when VS Code starts
- **Verify**: Check the debug console for "NuGet Package Manager extension is now active!"

#### Scenario 2: Command is registered
- **Steps**: 
  1. Press Ctrl+Shift+P (or Cmd+Shift+P on Mac)
  2. Type "NuGet: Package Update"
- **Expected**: Command appears in the command palette

#### Scenario 3: View installed packages
- **Setup**: Open a workspace with .csproj files containing PackageReference elements
- **Steps**:
  1. Run "NuGet: Package Update" command
  2. Observe the webview panel that opens
- **Expected**: 
  - Webview panel titled "NuGet Package Update" opens
  - All packages from all .csproj files are displayed
  - Each package shows: name, version, and source project file

#### Scenario 4: Search functionality
- **Setup**: Have the webview open with multiple packages
- **Steps**:
  1. Type in the search box (e.g., "Newtonsoft")
  2. Observe the filtered results
- **Expected**:
  - Results filter in real-time as you type
  - Only packages matching the search term are shown
  - Search works across package names, versions, and project files

#### Scenario 5: Empty workspace
- **Setup**: Open an empty workspace or one without .csproj files
- **Steps**: Run "NuGet: Package Update" command
- **Expected**: 
  - Webview opens but shows "No packages found"

### Sample Test Workspace

Create test .csproj files with the following content:

**TestProject1/TestProject1.csproj:**
```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Newtonsoft.Json" Version="13.0.3" />
    <PackageReference Include="Microsoft.Extensions.Logging" Version="8.0.0" />
    <PackageReference Include="Serilog" Version="3.1.1" />
  </ItemGroup>
</Project>
```

**TestProject2/TestProject2.csproj:**
```xml
<Project Sdk="Microsoft.NET.Sdk.Web">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Swashbuckle.AspNetCore" Version="6.5.0" />
    <PackageReference Include="AutoMapper" Version="12.0.1" />
    <PackageReference Include="Newtonsoft.Json" Version="13.0.3" />
  </ItemGroup>
</Project>
```

### Expected Package List

When opening the test workspace above, you should see 6 total packages:
1. Newtonsoft.Json v13.0.3 (TestProject1.csproj)
2. Microsoft.Extensions.Logging v8.0.0 (TestProject1.csproj)
3. Serilog v3.1.1 (TestProject1.csproj)
4. Swashbuckle.AspNetCore v6.5.0 (TestProject2.csproj)
5. AutoMapper v12.0.1 (TestProject2.csproj)
6. Newtonsoft.Json v13.0.3 (TestProject2.csproj)

Note: Newtonsoft.Json appears twice (once for each project).
