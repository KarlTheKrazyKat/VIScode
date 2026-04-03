import * as vscode from 'vscode';
import { showWhatsNewPage } from './whatsnew';

const LAST_VERSION_KEY = 'viscode.lastVersion';

/**
 * Called on every activation.
 * - No stored version  → first install → show welcome page, store version
 * - Stored version differs → update → show what's new page, store version
 * - Versions match → do nothing
 */
export function showLaunchPage(context: vscode.ExtensionContext) {
    const current: string = context.extension.packageJSON.version;
    const stored = context.globalState.get<string>(LAST_VERSION_KEY);

    if (!stored) {
        context.globalState.update(LAST_VERSION_KEY, current);
        showWelcomePage(context);
    } else if (stored !== current) {
        context.globalState.update(LAST_VERSION_KEY, current);
        showWhatsNewPage(context);
    }
}

export function showWelcomePage(context: vscode.ExtensionContext) {
    const panel = vscode.window.createWebviewPanel(
        'visWelcome',
        'Welcome to VIS',
        vscode.ViewColumn.One,
        { enableScripts: false }
    );
    panel.webview.html = getWelcomeHtml();
}

function getWelcomeHtml(): string {
    return /* html */`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';">
    <title>Welcome to VIS</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            max-width: 700px;
            margin: 48px auto;
            padding: 0 24px;
            line-height: 1.6;
        }
        h1 {
            font-size: 2em;
            font-weight: 600;
            margin-bottom: 4px;
            color: var(--vscode-foreground);
        }
        h2 {
            font-size: 1.1em;
            font-weight: 600;
            margin-top: 32px;
            margin-bottom: 8px;
            color: var(--vscode-foreground);
        }
        .subtitle {
            color: var(--vscode-descriptionForeground);
            margin-top: 0;
            margin-bottom: 32px;
        }
        .card {
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 6px;
            padding: 20px 24px;
            margin-bottom: 24px;
        }
        .card p {
            margin: 0 0 12px;
        }
        .card p:last-child {
            margin-bottom: 0;
        }
        .badge {
            display: inline-block;
            background-color: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            border-radius: 4px;
            padding: 1px 7px;
            font-size: 0.8em;
            font-weight: 600;
            vertical-align: middle;
            margin-left: 8px;
        }
        code {
            font-family: var(--vscode-editor-font-family);
            font-size: 0.95em;
            background-color: var(--vscode-textCodeBlock-background);
            border-radius: 4px;
            padding: 2px 6px;
        }
        .install-block {
            display: flex;
            align-items: center;
            gap: 12px;
            background-color: var(--vscode-textCodeBlock-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 6px;
            padding: 14px 18px;
            font-family: var(--vscode-editor-font-family);
            font-size: 1em;
        }
        .prompt {
            color: var(--vscode-terminal-ansiGreen);
            user-select: none;
        }
        ul {
            margin: 8px 0 0;
            padding-left: 20px;
        }
        li {
            margin-bottom: 6px;
        }
        .shortcut {
            color: var(--vscode-descriptionForeground);
            font-size: 0.9em;
        }
        hr {
            border: none;
            border-top: 1px solid var(--vscode-panel-border);
            margin: 32px 0;
        }
    </style>
</head>
<body>
    <h1>Welcome to VIS</h1>
    <p class="subtitle">Faster Tkinter UI development, right inside VS Code.</p>

    <div class="card">
        <p>
            VIS works with plain <strong>tkinter</strong> — you can start using it immediately
            with no extra dependencies.
        </p>
        <p>
            For the best experience, install <strong>VIStk</strong>
            <span class="badge">recommended</span><br>
            VIStk is the Python UI framework VIS is built around. It unlocks the full
            <code>LayoutFrame</code> / <code>.place()</code> workflow and enables upcoming
            features like project awareness and screen navigation.
        </p>
    </div>

    <h2>Install VIStk</h2>
    <p>Run the following command in your terminal:</p>
    <div class="install-block">
        <span class="prompt">$</span>
        <span>pip install VIStk</span>
    </div>

    <hr>

    <h2>Shortcuts</h2>
    <ul>
        <li><code>Shift+Alt+L</code> <span class="shortcut">— Add Label</span></li>
        <li><code>Shift+Alt+B</code> <span class="shortcut">— Add Button</span></li>
        <li><code>Shift+Alt+E</code> <span class="shortcut">— Add Entry</span></li>
        <li><code>Shift+Alt+M</code> <span class="shortcut">— Add Combobox</span></li>
        <li><code>Shift+Alt+K</code> <span class="shortcut">— Add Command Button</span></li>
    </ul>
    <p>
        All commands are also available via right-click → <strong>VIS</strong> in any Python file.
    </p>

    <hr>

    <h2>Settings</h2>
    <p>
        Disable insertion messages: set <code>viscode.showMessages</code> to <code>false</code>
        in your VS Code settings.
    </p>
</body>
</html>`;
}
