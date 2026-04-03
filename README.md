# viscode README

This is an extension to be used alongside the VIS python module available via github. Its aim is to make the creation of tkinter elements and screens even easier and faster than using the VIS module alone. Some planned features will require that the user has the VIS module installed as well and may only be available once a .VIS project has been initialized.

## Features

Auto write and place tkinter elements using the VIStk f_element `.place()` pattern:

- Label (shift+alt+L)
- Button (shift+alt+B)
- Entry (shift+alt+E)
- Combobox (shift+alt+M)
- Command Button (shift+alt+K)

Snippet insertion messages can be disabled via `viscode.showMessages` setting (default: true)

## Requirements

None

## Known Issues

None

## Release Notes

### 0.1.0

- All widget snippets use VIStk f_element `.place()` pattern (not `.grid()`)
- Added `addCommandButton` (shift+alt+K) — generates `tk.Button` with no preset styling
- Snippet messages gated on `viscode.showMessages` config (default: true)

### 0.0.3

- Added keyboard shortcuts all under shift+alt
- Auto label (shift+alt+L)
- Auto button (shift+alt+B)
- Auto entry (shift+alt+E)
- Auto combobox (shift+alt+M)

### 0.0.2

- Auto write and grid tkinter button
- Auto write and grid tkinter entry
- Auto write and grid tkinter combobox

### 0.0.1

- Auto write and grid tkinter label from selection menu

## Upcoming

- More elements creatable through VIS submenu
- VIS module functionality via VIS submenu
- VIS project awareness (show current screen)
- VIS project navigation (alternate file tree by screen)
- VIS project control (create, rename, edit screens)
