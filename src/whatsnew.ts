import * as vscode from 'vscode';

interface ChangeEntry {
    section: string;
    items: string[];
}

/** Add an entry here for every released version. */
const changelog: Record<string, ChangeEntry[]> = {
    '0.3.0': [
        {
            section: 'VIStk Project Navigation',
            items: [
                'Screen tree view in the Explorer sidebar — files grouped by screen instead of filesystem location.',
                'Each screen shows its entry-point script, plus collapsible <strong>Elements</strong> and <strong>Modules</strong> sub-groups.',
                'Tree title set dynamically to <code>VIS: &lt;ProjectName&gt;</code> from <code>project.json</code>.',
                'Clicking a file in the tree opens it in the editor.',
            ],
        },
    ],
    '0.2.0': [
        {
            section: 'VIStk Project Awareness',
            items: [
                'Status bar now shows the current VIStk screen name whenever a screen file is active.',
                'Works for entry-point scripts and section/module files inside <code>Screens/</code> and <code>modules/</code> directories.',
                'Reads <code>.VIS/project.json</code> from the workspace root — no configuration required.',
            ],
        },
    ],
    '0.1.0': [
        {
            section: 'Version 0.1.0',
            items: [
                'Initial stable release.',
            ],
        },
    ],
    '0.0.6': [
        {
            section: 'Welcome & What\'s New pages',
            items: [
                'Added a welcome page shown on first install with VIStk setup instructions.',
                'Added this What\'s New page — shown automatically when the extension updates.',
                'Added <code>VIS: Show Welcome Page</code> command to reopen the welcome page from the Command Palette.',
            ],
        },
    ],
};

export function showWhatsNewPage(context: vscode.ExtensionContext) {
    const version: string = context.extension.packageJSON.version;
    const entries = changelog[version] ?? [];

    const panel = vscode.window.createWebviewPanel(
        'visWhatsNew',
        `What's New in VIS ${version}`,
        vscode.ViewColumn.One,
        { enableScripts: false }
    );
    panel.webview.html = getWhatsNewHtml(version, entries);
}

function getWhatsNewHtml(version: string, entries: ChangeEntry[]): string {
    const sections = entries.length > 0
        ? entries.map(e => `
            <div class="card">
                <h2>${e.section}</h2>
                <ul>${e.items.map(i => `<li>${i}</li>`).join('')}</ul>
            </div>`).join('')
        : '<div class="card"><p class="muted">No notes available for this version.</p></div>';

    return /* html */`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';">
    <title>What's New in VIS ${version}</title>
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
        }
        h2 {
            font-size: 1.1em;
            font-weight: 600;
            margin: 0 0 12px;
            color: var(--vscode-foreground);
        }
        .subtitle {
            color: var(--vscode-descriptionForeground);
            margin-top: 0;
            margin-bottom: 8px;
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
        .card {
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 6px;
            padding: 20px 24px;
            margin-bottom: 16px;
        }
        ul {
            margin: 0;
            padding-left: 20px;
        }
        li {
            margin-bottom: 8px;
        }
        li:last-child {
            margin-bottom: 0;
        }
        code {
            font-family: var(--vscode-editor-font-family);
            font-size: 0.95em;
            background-color: var(--vscode-textCodeBlock-background);
            border-radius: 4px;
            padding: 2px 6px;
        }
        .muted {
            color: var(--vscode-descriptionForeground);
        }
        hr {
            border: none;
            border-top: 1px solid var(--vscode-panel-border);
            margin: 32px 0;
        }
    </style>
</head>
<body>
    <h1>What's New in VIS <span class="badge">${version}</span></h1>
    <p class="subtitle">Here's what changed in this update.</p>
    <hr>
    ${sections}
</body>
</html>`;
}
