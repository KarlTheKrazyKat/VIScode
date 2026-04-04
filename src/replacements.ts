import * as vscode from 'vscode';
import { registerCommands } from './commands';
import { showLaunchPage } from './welcome';
import { activateProjectAwareness } from './projectAwareness';
import { activateScreenTreeView } from './screenTreeView';

export function activate(context: vscode.ExtensionContext) {
    showLaunchPage(context);
    registerCommands(context);
    activateProjectAwareness(context);
    activateScreenTreeView(context);
}

export function deactivate() {}
