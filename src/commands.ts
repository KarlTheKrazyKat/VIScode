import * as vscode from 'vscode';
import { getLineIndent, detectFrame, detectNextPosition, makePlacementLine } from './frameDetection';
import { showWelcomePage } from './welcome';

function getFileRoot(editor: vscode.TextEditor): string {
    const parts = editor.document.fileName.split("\\");
    return parts[parts.length - 1].split(".")[0];
}

function getSelectionContext(editor: vscode.TextEditor) {
    const selRange = new vscode.Range(
        editor.selection.start.line, editor.selection.start.character,
        editor.selection.end.line,   editor.selection.end.character
    );
    const selected = editor.document.getText(selRange);
    const indent   = getLineIndent(editor.document, editor.selection.start.line);
    const frame    = detectFrame(editor.document, editor.selection.start.line);
    const parent   = frame ? frame.name : 'f_elem';
    const pos      = frame
        ? detectNextPosition(editor.document, frame, editor.selection.start.line)
        : { row: 1, col: 1 };
    return { selRange, selected, indent, frame, parent, pos };
}

function maybeNotify(message: string) {
    const config = vscode.workspace.getConfiguration('viscode');
    if (config.get<boolean>('showMessages')) {
        vscode.window.showInformationMessage(message);
    }
}

export function registerCommands(context: vscode.ExtensionContext) {

    const a_label = vscode.commands.registerTextEditorCommand('viscode.addLabel', (editor, edit) => {
        const root = getFileRoot(editor);
        const { selRange, selected, indent, frame, pos } = getSelectionContext(editor);
        const varName = `vl_${selected}`;
        const text = `${varName} = ttk.Label(${frame ? frame.name : 'f_elem'}, text="VIS Label")`
            + '\n' + makePlacementLine(varName, frame, root, indent, pos);
        edit.replace(selRange, text);
        maybeNotify('Created label from selection');
    });

    const a_button = vscode.commands.registerTextEditorCommand('viscode.addButton', (editor, edit) => {
        const root = getFileRoot(editor);
        const { selRange, selected, indent, frame, pos } = getSelectionContext(editor);
        const varName = `vb_${selected}`;
        const text = `${varName} = ttk.Button(${frame ? frame.name : 'f_elem'}, text="VIS Button", command=None)`
            + '\n' + makePlacementLine(varName, frame, root, indent, pos);
        edit.replace(selRange, text);
        maybeNotify('Created button from selection');
    });

    const a_entry = vscode.commands.registerTextEditorCommand('viscode.addEntry', (editor, edit) => {
        const root = getFileRoot(editor);
        const { selRange, selected, indent, frame, pos } = getSelectionContext(editor);
        const varName = `ve_${selected}`;
        const text = `${varName} = ttk.Entry(${frame ? frame.name : 'f_elem'}, textvariable=stringvar)`
            + '\n' + makePlacementLine(varName, frame, root, indent, pos);
        edit.replace(selRange, text);
        maybeNotify('Created an entry from selection');
    });

    const a_combobox = vscode.commands.registerTextEditorCommand('viscode.addCombobox', (editor, edit) => {
        const root = getFileRoot(editor);
        const { selRange, selected, indent, frame, pos } = getSelectionContext(editor);
        const varName = `vc_${selected}`;
        const text = `${varName} = ttk.Combobox(${frame ? frame.name : 'f_elem'}, values=list)`
            + '\n' + makePlacementLine(varName, frame, root, indent, pos);
        edit.replace(selRange, text);
        maybeNotify('Created combobox from selection');
    });

    const a_command_button = vscode.commands.registerTextEditorCommand('viscode.addCommandButton', (editor, edit) => {
        const root = getFileRoot(editor);
        const { selRange, selected, indent, frame, pos } = getSelectionContext(editor);
        const varName = `cb_${selected}`;
        const text = `${varName} = Button(${frame ? frame.name : 'f_elem'}, text="VIS Button", command=None)`
            + '\n' + makePlacementLine(varName, frame, root, indent, pos);
        edit.replace(selRange, text);
        maybeNotify('Created command button from selection');
    });

    const show_welcome = vscode.commands.registerCommand('viscode.showWelcome', () => {
        showWelcomePage(context);
    });

    context.subscriptions.push(a_label, a_button, a_entry, a_combobox, a_command_button, show_welcome);
}
