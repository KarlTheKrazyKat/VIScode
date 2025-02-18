// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "viscode" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const a_label = vscode.commands.registerTextEditorCommand('viscode.addLabel', (editor,edit) => {
		let path = editor.document.fileName.split("\\");
		let root = path[path.length-1].split(".")[0];
		let selectionRange = new vscode.Range(editor.selection.start.line, editor.selection.start.character, editor.selection.end.line, editor.selection.end.character);
		let selected = editor.document.getText(selectionRange);
		let text = "vl_"+selected+" = ttk.Label("+root+', text="VIS Label")';
		text = text + "\nvl_"+selected+".grid(row=n,column=n,sticky=(N, S, E, W))";
		edit.replace(editor.selection, text);

		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Created label from selection');
	});

	const a_button = vscode.commands.registerTextEditorCommand('viscode.addButton', (editor,edit) => {
		let path = editor.document.fileName.split("\\");
		let root = path[path.length-1].split(".")[0];
		let selectionRange = new vscode.Range(editor.selection.start.line, editor.selection.start.character, editor.selection.end.line, editor.selection.end.character);
		let selected = editor.document.getText(selectionRange);
		let text = "vb_"+selected+" = ttk.Button("+root+', text="VIS Button", command=None)';
		text = text + "\nvb_"+selected+".grid(row=n,column=n,sticky=(N, S, E, W))";
		edit.replace(editor.selection, text);

		// The code you place here will be executed every time your command is executed
		// Display a message box to the user 
		vscode.window.showInformationMessage('Created button from selection');
	});

	const a_entry = vscode.commands.registerTextEditorCommand('viscode.addEntry', (editor,edit) => {
		let path = editor.document.fileName.split("\\");
		let root = path[path.length-1].split(".")[0];
		let selectionRange = new vscode.Range(editor.selection.start.line, editor.selection.start.character, editor.selection.end.line, editor.selection.end.character);
		let selected = editor.document.getText(selectionRange);
		let text = "ve_"+selected+" = ttk.Entry("+root+', textvariable=stringvar)';
		text = text + "\nve_"+selected+".grid(row=n,column=n,sticky=(N, S, E, W))";
		edit.replace(editor.selection, text);

		// The code you place here will be executed every time your command is executed
		// Display a message box to the user 
		vscode.window.showInformationMessage('Created an entry from selection');
	});

	const a_combobox = vscode.commands.registerTextEditorCommand('viscode.addCombobox', (editor,edit) => {
		let path = editor.document.fileName.split("\\");
		let root = path[path.length-1].split(".")[0];
		let selectionRange = new vscode.Range(editor.selection.start.line, editor.selection.start.character, editor.selection.end.line, editor.selection.end.character);
		let selected = editor.document.getText(selectionRange);
		let text = "vc_"+selected+" = ttk.Combobox("+root+', values=list)';
		text = text + "\nvc_"+selected+".grid(row=n,column=n,sticky=(N, S, E, W))";
		edit.replace(editor.selection, text);

		// The code you place here will be executed every time your command is executed
		// Display a message box to the user 
		vscode.window.showInformationMessage('Created combobox from selection');
	});

	context.subscriptions.push(a_label);
	context.subscriptions.push(a_button);
	context.subscriptions.push(a_entry);
	context.subscriptions.push(a_combobox);
}

// This method is called when your extension is deactivated
export function deactivate() {}
