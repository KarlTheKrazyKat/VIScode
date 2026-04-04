import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

interface ScreenEntry {
    script?: string;
    [key: string]: unknown;
}

function findProjectJson(
    folders: readonly vscode.WorkspaceFolder[]
): { jsonPath: string; root: string } | null {
    for (const folder of folders) {
        const jsonPath = path.join(folder.uri.fsPath, '.VIS', 'project.json');
        if (fs.existsSync(jsonPath)) {
            return { jsonPath, root: folder.uri.fsPath };
        }
    }
    return null;
}

function loadScreens(jsonPath: string): Record<string, ScreenEntry> {
    try {
        const raw: Record<string, unknown> = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
        const projectKey = Object.keys(raw)[0];
        if (!projectKey) { return {}; }
        const project = raw[projectKey] as Record<string, unknown>;
        return (project.Screens as Record<string, ScreenEntry>) ?? {};
    } catch {
        return {};
    }
}

function findScreenForFile(
    filePath: string,
    root: string,
    screens: Record<string, ScreenEntry>
): string | null {
    const normalFile = filePath.toLowerCase();

    // Direct match against the screen's entry-point script
    for (const [name, entry] of Object.entries(screens)) {
        if (typeof entry.script === 'string') {
            const abs = path.resolve(root, entry.script).toLowerCase();
            if (abs === normalFile) { return name; }
        }
    }

    // Directory-based match for section/module files (Screens/{Name}/ or modules/{Name}/)
    const parts = filePath.replace(/\\/g, '/').split('/');
    const screenNames = Object.keys(screens);
    for (const part of parts) {
        const match = screenNames.find(n => n.toLowerCase() === part.toLowerCase());
        if (match) { return match; }
    }

    return null;
}

export function activateProjectAwareness(context: vscode.ExtensionContext) {
    const item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    context.subscriptions.push(item);

    function update() {
        const folders = vscode.workspace.workspaceFolders;
        const editor = vscode.window.activeTextEditor;
        if (!folders || !editor) { item.hide(); return; }

        const found = findProjectJson(folders);
        if (!found) { item.hide(); return; }

        const screens = loadScreens(found.jsonPath);
        const screen = findScreenForFile(editor.document.uri.fsPath, found.root, screens);

        if (screen) {
            item.text = `$(symbol-namespace) ${screen}`;
            item.tooltip = 'VIStk Screen';
            item.show();
        } else {
            item.hide();
        }
    }

    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(update));
    context.subscriptions.push(vscode.workspace.onDidChangeWorkspaceFolders(update));
    update();
}
