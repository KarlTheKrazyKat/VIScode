# Change Log

## [Released]

### 0.0.5 Smart Snippet Placement

- Indentation preserved: second snippet line inherits the cursor line's leading whitespace
- Frame detection: searches backward through the file to find the innermost frame (`LayoutFrame` or `ttk.Frame`)
- Auto position: counts existing placement calls above the cursor and emits the next row automatically
  - `ttk.Frame` (grid) → `.grid(row=R, column=0, sticky=(N, S, E, W))`
  - `LayoutFrame` (VIStk) → `.place(frameName.Layout.cell(R, 1))`
- Detected frame name used as widget parent (falls back to `f_elem` when no frame found)

## [Unreleased]

### 0.1.0 TK Hotkeys & VIStk Pattern

- All widget snippets use VIStk f_element `.place()` pattern (not `.grid()`)
- Added `addCommandButton` (shift+alt+K) — generates `tk.Button` with no preset styling
- Snippet messages gated on `viscode.showMessages` config (default: true)

### 0.2.0 VIStk Project Awareness

- Display current screen somewhere on the bottom row regardless of which screen file is opened

### 0.3.0 VIStk Project Navigation

- alternative file tree menu with the files grouped by screen rather than location

### 0.4.0 VIStk Project Control

- create, rename, edit screens through the alternate file tree

### 0.5.0 VIStk Project Settings

- Edit project settings, defaults, and more all in visual studio

### 0.6.0 VIStk Project stuff

- idk some more stuff
