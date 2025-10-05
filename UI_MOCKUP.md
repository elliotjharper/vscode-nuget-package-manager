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
│  │   │ Version: 13.0.3                                   │  │
│  │   │ Project: TestProject1.csproj                      │  │
│  │   │ Version: 13.0.3                                   │  │
│  │   │ Project: TestProject2.csproj                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Microsoft.Extensions.Logging                          │  │
│  │   │ Version: 8.0.0                                    │  │
│  │   │ Project: TestProject1.csproj                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Serilog                                               │  │
│  │   │ Version: 3.1.1                                    │  │
│  │   │ Project: TestProject1.csproj                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Swashbuckle.AspNetCore                                │  │
│  │   │ Version: 6.5.0                                    │  │
│  │   │ Project: TestProject2.csproj                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ AutoMapper                                            │  │
│  │   │ Version: 12.0.1                                   │  │
│  │   │ Project: TestProject2.csproj                      │  │
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
- Version: 14px, regular
- Project: 12px, regular
- Search placeholder: 14px, italic

### Spacing

- Outer padding: 20px
- Card padding: 12px
- Card margins: 8px between cards
- Search box margin: 20px below

### Interactive Elements

- Search box: Full-width input with focus outline
- Real-time filtering as user types
- Smooth, instant updates (no loading states needed)

## Accessibility

- Semantic HTML structure
- Proper heading hierarchy
- Input has placeholder text
- Color contrast follows VSCode theme standards
