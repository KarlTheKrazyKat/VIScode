# VIS — VIStk for Visual Studio Code

VS Code extension for [VIStk](https://github.com/KarlTheKrazyKat/VIStk), the Tkinter application framework. Speeds up widget creation, adds project-aware navigation, and lets you manage screens without leaving the editor.

## Features

### Screen Contract Diagnostics

Real-time diagnostics for VIStk screen files, catching mistakes that crash the Host at edit time instead of runtime.

**Missing required functions** — screen entry-point scripts (listed in `project.json`) are checked for the five functions every VIStk screen must define:

- `setup(parent)`
- `loop()`
- `configure_menu(menubar)`
- `on_focused()`
- `on_unfocused()`

Missing functions appear as warnings.

**Module-level widget creation** — widget construction (`ttk.*`, `tk.*`, `LayoutFrame`, `StringVar`, `.pack()`, `.place()`, `.grid()`, etc.) at module level is flagged as an error. All widget creation must live inside `setup()` or `build()`.

Diagnostics run on open, save, and as-you-type for all Python files inside a VIStk project (detected via `.VIS/project.json`).

**Tree view indicators** — the VIS Screens tree shows red error or yellow warning icons on files, category folders, and screen nodes when diagnostics are present. Hover over a file to see the details.

### Widget Snippets

Select text and press a hotkey to generate a placed Tkinter widget:

| Hotkey | Widget |
|--------|--------|
| shift+alt+L | Label |
| shift+alt+B | Button |
| shift+alt+E | Entry |
| shift+alt+M | Combobox |
| shift+alt+K | Command Button |

- Auto-detects the enclosing frame (`LayoutFrame` or `ttk.Frame`) and uses it as the parent
- Auto-positions the widget at the next available row
- Reads `columnconfigure` / `rowconfigure` to pick the correct starting column
- Snippet messages can be toggled via `viscode.showMessages` (default: true)

### Project Navigation

When a `.VIS/project.json` is present in the workspace:

- **Screen Tree View** — an Explorer sidebar panel groups files by screen instead of filesystem location. Each screen shows its entry-point script, plus collapsible **Elements** and **Modules** folders.
- **Status Bar** — shows the current VIStk screen name whenever a screen file is active.

### Project Control

Create, rename, and edit screens directly from the tree view — all operations delegate to VIStk CLI commands so the extension stays compatible with any VIStk version.

| Action | How |
|--------|-----|
| **Create Screen** | `+` button in tree title bar |
| **Rename Screen** | Right-click a screen |
| **Edit Screen** | Right-click a screen, pick an attribute to change |
| **Add Element** | Right-click a screen or Elements folder |

### Host & Run

- **Run Screen** — right-click a screen to launch it via `VIS <project> <screen>`
- **Host Status** — the tree view shows whether the VIStk Host is currently running
- **Stop Host** — stop button appears in the tree title bar when the Host is active

## Requirements

- [VIStk](https://github.com/KarlTheKrazyKat/VIStk) must be installed (`pip install VIStk`) for project control and host features.
- Widget snippets work in any Python file, no VIStk installation required.

## Release Notes

See [CHANGELOG.md](CHANGELOG.md) for the full history.
