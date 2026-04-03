// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns the leading whitespace of a line (tabs or spaces). */
function getLineIndent(document: vscode.TextDocument, lineNumber: number): string {
	return document.lineAt(lineNumber).text.match(/^(\s*)/)?.[1] ?? '';
}

interface FrameInfo {
	name: string;
	type: 'layout' | 'grid';
	definedAtLine: number;
}

/**
 * Searches backward from `cursorLine` to find the innermost frame definition.
 * - `LayoutFrame(` → VIStk layout frame
 * - `ttk.Frame(` with a subsequent `.columnconfigure()` or `.rowconfigure()` → tkinter grid frame
 * Returns null if nothing is found.
 */
function detectFrame(document: vscode.TextDocument, cursorLine: number): FrameInfo | null {
	const layoutFrameRe = /(\w+)\s*=\s*LayoutFrame\(/;
	const ttkFrameRe    = /(\w+)\s*=\s*ttk\.Frame\(/;

	for (let i = cursorLine; i >= 0; i--) {
		const line = document.lineAt(i).text;

		const lm = layoutFrameRe.exec(line);
		if (lm) {
			return { name: lm[1], type: 'layout', definedAtLine: i };
		}

		const tm = ttkFrameRe.exec(line);
		if (tm) {
			const frameName = tm[1];
			for (let j = i + 1; j <= cursorLine; j++) {
				const jLine = document.lineAt(j).text;
				if (jLine.includes(frameName + '.columnconfigure(') ||
					jLine.includes(frameName + '.rowconfigure(')) {
					return { name: frameName, type: 'grid', definedAtLine: i };
				}
			}
			return { name: frameName, type: 'grid', definedAtLine: i };
		}
	}
	return null;
}

/**
 * Scans the lines between the frame definition and the cursor to find the
 * next available placement position.
 *
 * Grid:   looks for `.grid(row=X, ...)` calls — next row = max + 1, col = 0
 * Layout: looks for `frameName.Layout.cell(X, Y)` calls — next row = max + 1, col = 1 (1-indexed)
 */
function detectNextPosition(
	document: vscode.TextDocument,
	frame: FrameInfo,
	cursorLine: number
): { row: number; col: number } {
	if (frame.type === 'grid') {
		const rowRe = /\.grid\([^)]*\brow\s*=\s*(\d+)/;
		let maxRow = -1;
		for (let i = frame.definedAtLine + 1; i < cursorLine; i++) {
			const m = rowRe.exec(document.lineAt(i).text);
			if (m) { maxRow = Math.max(maxRow, parseInt(m[1], 10)); }
		}
		return { row: maxRow + 1, col: 0 };
	} else {
		// Escape frame name for use in regex
		const escaped = frame.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		const cellRe  = new RegExp(escaped + '\\.Layout\\.cell\\((\\d+),\\s*(\\d+)\\)');
		let maxRow = 0;
		for (let i = frame.definedAtLine + 1; i < cursorLine; i++) {
			const m = cellRe.exec(document.lineAt(i).text);
			if (m) { maxRow = Math.max(maxRow, parseInt(m[1], 10)); }
		}
		return { row: maxRow + 1, col: 1 };
	}
}

/**
 * Builds the placement line for a widget.
 * - VIStk layout: `widget.place(frameName.Layout.cell(row, col))`
 * - tkinter grid:  `widget.grid(row=R, column=C, sticky=(N, S, E, W))`
 *
 * `indent` is prepended so the line matches the surrounding block's indentation.
 * `fallbackLayout` is used when frame is null (typically the file's root name).
 */
function makePlacementLine(
	widgetVar: string,
	frame: FrameInfo | null,
	fallbackLayout: string,
	indent: string,
	pos: { row: number; col: number }
): string {
	if (frame === null || frame.type === 'layout') {
		const ref = frame ? frame.name : fallbackLayout;
		return `${indent}${widgetVar}.place(${ref}.Layout.cell(${pos.row}, ${pos.col}))`;
	}
	return `${indent}${widgetVar}.grid(row=${pos.row}, column=${pos.col}, sticky=(N, S, E, W))`;
}

// ---------------------------------------------------------------------------
// Extension entry point
// ---------------------------------------------------------------------------

export function activate(context: vscode.ExtensionContext) {

	const a_label = vscode.commands.registerTextEditorCommand('viscode.addLabel', (editor, edit) => {
		const fileParts = editor.document.fileName.split("\\");
		const root = fileParts[fileParts.length - 1].split(".")[0];

		const selRange = new vscode.Range(
			editor.selection.start.line, editor.selection.start.character,
			editor.selection.end.line, editor.selection.end.character
		);
		const selected = editor.document.getText(selRange);
		const indent   = getLineIndent(editor.document, editor.selection.start.line);
		const frame    = detectFrame(editor.document, editor.selection.start.line);
		const parent   = frame ? frame.name : 'f_elem';
		const pos      = frame ? detectNextPosition(editor.document, frame, editor.selection.start.line)
		                       : { row: 1, col: 1 };
		const varName  = `vl_${selected}`;

		let text = `${varName} = ttk.Label(${parent}, text="VIS Label")`;
		text += '\n' + makePlacementLine(varName, frame, root, indent, pos);
		edit.replace(editor.selection, text);

		const config = vscode.workspace.getConfiguration('viscode');
		if (config.get<boolean>('showMessages')) {
			vscode.window.showInformationMessage('Created label from selection');
		}
	});

	const a_button = vscode.commands.registerTextEditorCommand('viscode.addButton', (editor, edit) => {
		const fileParts = editor.document.fileName.split("\\");
		const root = fileParts[fileParts.length - 1].split(".")[0];

		const selRange = new vscode.Range(
			editor.selection.start.line, editor.selection.start.character,
			editor.selection.end.line, editor.selection.end.character
		);
		const selected = editor.document.getText(selRange);
		const indent   = getLineIndent(editor.document, editor.selection.start.line);
		const frame    = detectFrame(editor.document, editor.selection.start.line);
		const parent   = frame ? frame.name : 'f_elem';
		const pos      = frame ? detectNextPosition(editor.document, frame, editor.selection.start.line)
		                       : { row: 1, col: 1 };
		const varName  = `vb_${selected}`;

		let text = `${varName} = ttk.Button(${parent}, text="VIS Button", command=None)`;
		text += '\n' + makePlacementLine(varName, frame, root, indent, pos);
		edit.replace(editor.selection, text);

		const config = vscode.workspace.getConfiguration('viscode');
		if (config.get<boolean>('showMessages')) {
			vscode.window.showInformationMessage('Created button from selection');
		}
	});

	const a_entry = vscode.commands.registerTextEditorCommand('viscode.addEntry', (editor, edit) => {
		const fileParts = editor.document.fileName.split("\\");
		const root = fileParts[fileParts.length - 1].split(".")[0];

		const selRange = new vscode.Range(
			editor.selection.start.line, editor.selection.start.character,
			editor.selection.end.line, editor.selection.end.character
		);
		const selected = editor.document.getText(selRange);
		const indent   = getLineIndent(editor.document, editor.selection.start.line);
		const frame    = detectFrame(editor.document, editor.selection.start.line);
		const parent   = frame ? frame.name : 'f_elem';
		const pos      = frame ? detectNextPosition(editor.document, frame, editor.selection.start.line)
		                       : { row: 1, col: 1 };
		const varName  = `ve_${selected}`;

		let text = `${varName} = ttk.Entry(${parent}, textvariable=stringvar)`;
		text += '\n' + makePlacementLine(varName, frame, root, indent, pos);
		edit.replace(editor.selection, text);

		const config = vscode.workspace.getConfiguration('viscode');
		if (config.get<boolean>('showMessages')) {
			vscode.window.showInformationMessage('Created an entry from selection');
		}
	});

	const a_combobox = vscode.commands.registerTextEditorCommand('viscode.addCombobox', (editor, edit) => {
		const fileParts = editor.document.fileName.split("\\");
		const root = fileParts[fileParts.length - 1].split(".")[0];

		const selRange = new vscode.Range(
			editor.selection.start.line, editor.selection.start.character,
			editor.selection.end.line, editor.selection.end.character
		);
		const selected = editor.document.getText(selRange);
		const indent   = getLineIndent(editor.document, editor.selection.start.line);
		const frame    = detectFrame(editor.document, editor.selection.start.line);
		const parent   = frame ? frame.name : 'f_elem';
		const pos      = frame ? detectNextPosition(editor.document, frame, editor.selection.start.line)
		                       : { row: 1, col: 1 };
		const varName  = `vc_${selected}`;

		let text = `${varName} = ttk.Combobox(${parent}, values=list)`;
		text += '\n' + makePlacementLine(varName, frame, root, indent, pos);
		edit.replace(editor.selection, text);

		const config = vscode.workspace.getConfiguration('viscode');
		if (config.get<boolean>('showMessages')) {
			vscode.window.showInformationMessage('Created combobox from selection');
		}
	});

	const a_command_button = vscode.commands.registerTextEditorCommand('viscode.addCommandButton', (editor: vscode.TextEditor, edit: vscode.TextEditorEdit) => {
		const fileParts = editor.document.fileName.split("\\");
		const root = fileParts[fileParts.length - 1].split(".")[0];

		const selRange = new vscode.Range(
			editor.selection.start.line, editor.selection.start.character,
			editor.selection.end.line, editor.selection.end.character
		);
		const selected = editor.document.getText(selRange);
		const indent   = getLineIndent(editor.document, editor.selection.start.line);
		const frame    = detectFrame(editor.document, editor.selection.start.line);
		const parent   = frame ? frame.name : 'f_elem';
		const pos      = frame ? detectNextPosition(editor.document, frame, editor.selection.start.line)
		                       : { row: 1, col: 1 };
		const varName  = `cb_${selected}`;

		let text = `${varName} = Button(${parent}, text="VIS Button", command=None)`;
		text += '\n' + makePlacementLine(varName, frame, root, indent, pos);
		edit.replace(editor.selection, text);

		const config = vscode.workspace.getConfiguration('viscode');
		if (config.get<boolean>('showMessages')) {
			vscode.window.showInformationMessage('Created command button from selection');
		}
	});

	context.subscriptions.push(a_label);
	context.subscriptions.push(a_button);
	context.subscriptions.push(a_entry);
	context.subscriptions.push(a_combobox);
	context.subscriptions.push(a_command_button);
}

// This method is called when your extension is deactivated
export function deactivate() {}
