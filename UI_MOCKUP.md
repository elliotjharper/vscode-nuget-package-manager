# UI Mockup Description

## NuGet Package Update Webview

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│ NuGet Package Update                                         │
│─────────────────────────────────────────────────────────────│
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 🔍 Search installed packages...                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  Showing 4 packages                                          │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Newtonsoft.Json                                       │  │
│  │   │ 13.0.3 - TestProject1.csproj                      │  │
│  │   │ 13.0.3 - TestProject2.csproj                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Microsoft.Extensions.Logging                          │  │
│  │   │ 8.0.0 - TestProject1.csproj                       │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Serilog                                               │  │
│  │   │ 3.1.1 - TestProject1.csproj                       │  │
│  │   │ 3.2.0 - TestProject2.csproj                       │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Swashbuckle.AspNetCore                                │  │
│  │   │ 6.5.0 - TestProject2.csproj                       │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ AutoMapper                                            │  │
│  │   │ 12.0.1 - TestProject2.csproj                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Search Example

When typing "seri" in the search box:

```
┌─────────────────────────────────────────────────────────────┐
│ NuGet Package Update                                         │
│─────────────────────────────────────────────────────────────│
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 🔍 seri█                                              │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  Showing 1 package                                           │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Serilog                                               │  │
│  │ Version: 3.1.1                                        │  │
│  │ Project: TestProject1.csproj                          │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Empty State

When no packages are found:

```
┌─────────────────────────────────────────────────────────────┐
│ NuGet Package Update                                         │
│─────────────────────────────────────────────────────────────│
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 🔍 Search installed packages...                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  No packages found                                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Visual Design

### Color Scheme

- Uses VSCode theme variables for automatic light/dark mode support
- Background: Editor background color
- Text: Editor foreground color
- Cards: Inactive selection background
- Search box: Input background with border

### Typography

- Title (h1): 24px, bold
- Package name: 16px, bold
- Consumer entries: 14px, regular
- Search placeholder: 14px, italic
- Version conflicts: Bold text with error color (red in light theme, red-ish in dark theme)

### Spacing

- Outer padding: 20px
- Card padding: 12px
- Card margins: 8px between cards
- Search box margin: 20px below

### Interactive Elements

- Search box: Full-width input with focus outline
- Real-time filtering as user types
- Smooth, instant updates (no loading states needed)
- **Version conflict highlighting**: When a package has different versions across projects, all consumer entries for that package are highlighted in red
- **Interactive version resolution**: Hover over conflicted versions to see tooltip, click to standardize that version across all projects

## Accessibility

- Semantic HTML structure
- Proper heading hierarchy
- Input has placeholder text
- Color contrast follows VSCode theme standards
