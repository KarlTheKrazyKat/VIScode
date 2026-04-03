import * as vscode from 'vscode';
import { registerCommands } from './commands';
import { showLaunchPage } from './welcome';

export function activate(context: vscode.ExtensionContext) {
    showLaunchPage(context);
    registerCommands(context);
}

export function deactivate() {}
