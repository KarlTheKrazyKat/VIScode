# Change Log

## [Released]

### 0.5.1 Screen Contract Diagnostics

- **Missing function warnings** — screen entry-point scripts are checked for the five required VIStk functions (`setup`, `loop`, `configure_menu`, `on_focused`, `on_unfocused`). Missing functions show as warnings on line 1.
- **Module-level widget errors** — widget creation (`ttk.*`, `tk.*`, `LayoutFrame`, `StringVar`, `.pack()`, `.place()`, `.grid()`, etc.) at module level is flagged as an error. All widget creation must live inside `setup()` or `build()`.
- Diagnostics run on file open, save, and as-you-type for all Python files inside a VIStk project (detected via `.VIS/project.json`).
- Non-screen Python files in the project still get module-level widget checks, but not the missing-function check.
- **Tree view indicators** — screens and files in the VIS Screens tree show red error or yellow warning icons when diagnostics are present. Hover over a file to see the diagnostic details. Icons bubble up from files to category folders and screen nodes.

### 0.4.2 Housekeeping

- Added MIT license
- Added marketplace icon (VIS.png)
- Updated README with full feature overview for the marketplace listing
- Fixed grid snippet placement using wrong starting column — now reads `columnconfigure` from the frame

### 0.4.1 Host & Run

- **Run Screen** — right-click a screen in the tree to launch it via `VIS <project> <screen>`
- **Host status indicator** — tree view description shows whether the Host is currently running (polled every 3s via port file + TCP check)
- **Stop Host** — stop button appears in tree title bar when Host is running, sends `VIS stop`

### 0.4.0 VIStk Project Control

- All screen operations delegate to VIStk CLI / Python API — the extension stays in sync with VIStk regardless of internal changes
- **Create Screen** — `+` button in tree title bar runs `VIS add screen <name>`
- **Rename Screen** — right-click a screen, runs `VIS rename <old> <new>`
- **Edit Screen** — right-click a screen to modify attributes (tabbed, release, icon, desc, version, etc.) via `VIS edit`
- **Add Element** — right-click a screen or Elements folder to add `f_<name>.py` + `m_<name>.py` via `Screen.addElement()`
- Right-click context menus on screens and category nodes in the VIS Screens tree

### 0.3.0 VIStk Project Navigation

- Screen tree view in the Explorer sidebar — files grouped by screen instead of filesystem location
- Each screen shows its entry-point script, plus collapsible **Elements** and **Modules** sub-groups
- Reads `.VIS/project.json` to discover screens and the project name
- Tree title set dynamically to `VIS: <ProjectName>`
- Tree auto-refreshes when `project.json` changes
- Clicking a file in the tree opens it in the editor
- Bundled VIS.ico from VIStk for future marketplace listing

### 0.2.0 VIStk Project Awareness

- Status bar shows the current VIStk screen name whenever a screen file is active
- Works for entry-point scripts and section/module files inside `Screens/` and `modules/` directories
- Reads `.VIS/project.json` from the workspace root — no configuration required

### 0.1.0 TK Hotkeys & VIStk Pattern

- All widget snippets use VIStk f_element `.place()` pattern (not `.grid()`)
- Added `addCommandButton` (shift+alt+K) — generates `tk.Button` with no preset styling
- Snippet messages gated on `viscode.showMessages` config (default: true)

### 0.0.5 Smart Snippet Placement

- Indentation preserved: second snippet line inherits the cursor line's leading whitespace
- Frame detection: searches backward through the file to find the innermost frame (`LayoutFrame` or `ttk.Frame`)
- Auto position: counts existing placement calls above the cursor and emits the next row automatically
  - `ttk.Frame` (grid) → `.grid(row=R, column=0, sticky=(N, S, E, W))`
  - `LayoutFrame` (VIStk) → `.place(frameName.Layout.cell(R, 1))`
- Detected frame name used as widget parent (falls back to `f_elem` when no frame found)

## [Unreleased]

### 0.6.0 VIStk Project Settings

- Visual editor for project settings and screen attributes
