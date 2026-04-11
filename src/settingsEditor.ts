import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { spawn } from 'child_process';

interface ProjectJson {
    [projectKey: string]: {
        Screens: Record<string, Record<string, unknown>>;
        defaults?: Record<string, unknown>;
        metadata?: Record<string, unknown>;
        release_info?: Record<string, unknown>;
        host?: Record<string, unknown>;
    };
}

function findProjectJson(): { filePath: string; data: ProjectJson; projectKey: string } | null {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders) { return null; }

    for (const folder of folders) {
        const filePath = path.join(folder.uri.fsPath, '.VIS', 'project.json');
        if (!fs.existsSync(filePath)) { continue; }
        try {
            const data = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as ProjectJson;
            const projectKey = Object.keys(data)[0];
            if (projectKey) { return { filePath, data, projectKey }; }
        } catch { /* skip */ }
    }
    return null;
}

class SettingsViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'visSettingsView';
    private _view?: vscode.WebviewView;

    constructor(private readonly _context: vscode.ExtensionContext) {}

    resolveWebviewView(webviewView: vscode.WebviewView) {
        this._view = webviewView;
        webviewView.webview.options = { enableScripts: true };
        this._render();

        webviewView.webview.onDidReceiveMessage(msg => {
            if (msg.type === 'update') {
                this._handleUpdate(msg);
            } else if (msg.type === 'addScreen') {
                this._handleAddScreen(msg.name);
            } else if (msg.type === 'renameScreen') {
                this._handleRenameScreen(msg.oldName, msg.newName);
            } else if (msg.type === 'deleteScreen') {
                this._handleDeleteScreen(msg.name);
            }
        });
    }

    refresh() {
        if (this._view) { this._render(); }
    }

    private _runVIS(args: string[], stdinLines?: string[]) {
        const proj = findProjectJson();
        if (!proj) { return; }
        const projectRoot = path.dirname(path.dirname(proj.filePath));
        const self = this;

        const child = spawn('VIS', args, { cwd: projectRoot, shell: true, env: { ...process.env } });
        let stderr = '';
        let stdout = '';

        child.stdout.on('data', (data: Buffer) => { stdout += data.toString(); });
        child.stderr.on('data', (data: Buffer) => { stderr += data.toString(); });
        child.on('close', (code: number) => {
            if (code !== 0) {
                vscode.window.showErrorMessage(`VIS failed: ${(stderr || stdout).trim()}`);
            } else {
                vscode.window.setStatusBarMessage(`VIS: ${args.join(' ')} done`, 3000);
            }
            self.refresh();
        });
        child.on('error', (err: Error) => {
            vscode.window.showErrorMessage(`VIS spawn error: ${err.message}`);
        });

        if (stdinLines) {
            child.stdin.write(stdinLines.join('\n') + '\n');
            child.stdin.end();
        }
    }

    private _handleAddScreen(name: string) {
        // Answers to newScreen prompts:
        // 1. "Should python script use name X.py?" → yes
        // 2. "Should this screen have its own .exe?" → no
        // 3. "What is the icon for this screen (or none)?" → none
        // 4. "Write a description for this screen:" → (empty)
        // 5. "Should this screen open as a tab inside the Host?" → no
        this._runVIS(['add', 'screen', name], ['yes', 'no', 'none', '', 'no']);
    }

    private _handleRenameScreen(oldName: string, newName: string) {
        this._runVIS(['rename', oldName, newName]);
    }

    private _handleDeleteScreen(name: string) {
        this._runVIS(['remove', name]);
    }

    private _render() {
        if (!this._view) { return; }
        const proj = findProjectJson();
        if (!proj) {
            this._view.webview.html = '<html><body><p>No VIStk project found.</p></body></html>';
            return;
        }
        this._view.webview.html = getSettingsHtml(proj.data, proj.projectKey);
    }

    private _handleUpdate(msg: { section: string; screen?: string; field: string; value: unknown }) {
        const proj = findProjectJson();
        if (!proj) { return; }

        const project = proj.data[proj.projectKey];

        switch (msg.section) {
            case 'metadata':
                if (!project.metadata) { project.metadata = {}; }
                project.metadata[msg.field] = msg.value;
                break;
            case 'defaults':
                if (!project.defaults) { project.defaults = {}; }
                if (msg.field === 'default_screen' && (msg.value === '' || msg.value === 'None')) {
                    project.defaults[msg.field] = null;
                } else {
                    project.defaults[msg.field] = msg.value;
                }
                break;
            case 'release_info':
                if (!project.release_info) { project.release_info = {}; }
                if (msg.field === 'hidden_imports') {
                    project.release_info[msg.field] = (msg.value as string).split(',').map(s => s.trim()).filter(Boolean);
                } else {
                    project.release_info[msg.field] = msg.value;
                }
                break;
            case 'host':
                if (!project.host) { project.host = {}; }
                project.host[msg.field] = msg.value;
                break;
            case 'screen':
                if (msg.screen && project.Screens[msg.screen]) {
                    const screen = project.Screens[msg.screen];
                    if (msg.field === 'release' || msg.field === 'tabbed' || msg.field === 'single_instance') {
                        screen[msg.field] = msg.value === true || msg.value === 'true';
                    } else if (msg.field === 'icon' && (msg.value === '' || msg.value === 'null' || msg.value === 'None')) {
                        screen[msg.field] = null;
                    } else {
                        screen[msg.field] = msg.value;
                    }
                }
                break;
        }

        fs.writeFileSync(proj.filePath, JSON.stringify(proj.data, null, 4));
    }
}

function getSettingsHtml(data: ProjectJson, projectKey: string): string {
    const project = data[projectKey];
    const meta = project.metadata || {};
    const defaults = project.defaults || {};
    const releaseInfo = project.release_info || {};
    const host = project.host || {};
    const screens = project.Screens || {};

    const screenSections = Object.keys(screens).sort().map(name => {
        const s = screens[name];
        return /* html */`
        <details class="screen-section" data-screen="${name}">
            <summary data-screen="${name}">${name}</summary>
            <div class="fields">
                ${textField('screen', 'script', s.script as string || '', name, 'Entry script')}
                ${textField('screen', 'desc', s.desc as string || '', name, 'Description')}
                ${textField('screen', 'version', s.version as string || '', name, 'Version')}
                ${textField('screen', 'icon', s.icon === null ? '' : (s.icon as string || ''), name, 'Icon (blank = project default)')}
                ${checkbox('screen', 'release', s.release as boolean, name, 'Release')}
                ${checkbox('screen', 'tabbed', s.tabbed as boolean, name, 'Tabbed')}
                ${checkbox('screen', 'single_instance', s.single_instance as boolean, name, 'Single instance')}
            </div>
        </details>`;
    }).join('\n');

    return /* html */`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
    <title>Project Settings</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background: var(--vscode-sideBar-background);
            padding: 8px 12px;
            margin: 0;
        }
        h2 {
            font-size: 1em;
            font-weight: 600;
            margin: 16px 0 6px;
            color: var(--vscode-foreground);
            text-transform: uppercase;
            letter-spacing: 0.5px;
            opacity: 0.8;
        }
        h2:first-child { margin-top: 4px; }
        .field {
            display: flex;
            align-items: center;
            margin-bottom: 6px;
            gap: 8px;
        }
        .field label {
            min-width: 90px;
            font-size: 0.9em;
            color: var(--vscode-descriptionForeground);
            flex-shrink: 0;
        }
        .field input[type="text"] {
            flex: 1;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border, transparent);
            border-radius: 2px;
            padding: 3px 6px;
            font-family: inherit;
            font-size: inherit;
            outline: none;
            min-width: 0;
        }
        .field input[type="text"]:focus {
            border-color: var(--vscode-focusBorder);
        }
        .field input[type="checkbox"] {
            accent-color: var(--vscode-checkbox-background);
        }
        .field select {
            flex: 1;
            background: var(--vscode-dropdown-background);
            color: var(--vscode-dropdown-foreground);
            border: 1px solid var(--vscode-dropdown-border, transparent);
            border-radius: 2px;
            padding: 3px 6px;
            font-family: inherit;
            font-size: inherit;
            outline: none;
            min-width: 0;
        }
        .field select:focus {
            border-color: var(--vscode-focusBorder);
        }
        .check-label {
            font-size: 0.9em;
            color: var(--vscode-foreground);
            cursor: pointer;
        }
        details {
            margin-bottom: 4px;
        }
        summary {
            cursor: pointer;
            font-weight: 600;
            padding: 4px 0;
            user-select: none;
            color: var(--vscode-foreground);
        }
        summary:hover {
            color: var(--vscode-textLink-foreground);
        }
        .fields {
            padding: 4px 0 8px 8px;
        }
        .screen-section {
            border-left: 2px solid var(--vscode-panel-border);
            padding-left: 8px;
            margin-bottom: 6px;
        }
        hr {
            border: none;
            border-top: 1px solid var(--vscode-panel-border);
            margin: 12px 0;
        }
        .screens-header {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .screens-header h2 {
            margin: 16px 0 6px;
            flex-shrink: 0;
        }
        .new-screen-input {
            flex: 1;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border, transparent);
            border-radius: 2px;
            padding: 3px 6px;
            font-family: inherit;
            font-size: inherit;
            outline: none;
            min-width: 0;
            margin-top: 10px;
        }
        .new-screen-input:focus {
            border-color: var(--vscode-focusBorder);
        }
        .add-btn {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 2px;
            width: 22px;
            height: 22px;
            font-size: 16px;
            line-height: 1;
            cursor: pointer;
            flex-shrink: 0;
            margin-top: 10px;
        }
        .add-btn:hover {
            background: var(--vscode-button-hoverBackground);
        }
        .rename-input {
            flex: 1;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-focusBorder);
            border-radius: 2px;
            padding: 3px 6px;
            font-family: inherit;
            font-size: inherit;
            outline: none;
            min-width: 0;
        }
        .ctx-menu {
            position: fixed;
            background: var(--vscode-menu-background);
            color: var(--vscode-menu-foreground);
            border: 1px solid var(--vscode-menu-border, var(--vscode-panel-border));
            border-radius: 4px;
            padding: 4px 0;
            z-index: 1000;
            min-width: 120px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }
        .ctx-menu div {
            padding: 4px 16px;
            cursor: pointer;
            font-size: 0.9em;
        }
        .ctx-menu div:hover {
            background: var(--vscode-menu-selectionBackground);
            color: var(--vscode-menu-selectionForeground);
        }
        .ctx-menu .danger:hover {
            background: var(--vscode-inputValidation-errorBackground, #5a1d1d);
        }
        .ctx-menu hr {
            margin: 4px 0;
            border: none;
            border-top: 1px solid var(--vscode-menu-separatorBackground, var(--vscode-panel-border));
        }
    </style>
</head>
<body>
    <h2>Project — ${projectKey}</h2>

    <details open>
        <summary>Metadata</summary>
        <div class="fields">
            ${textField('metadata', 'version', meta.version as string || '', undefined, 'Version')}
            ${textField('metadata', 'company', meta.company as string || '', undefined, 'Company')}
            ${textField('metadata', 'copyright', meta.copyright as string || '', undefined, 'Copyright')}
        </div>
    </details>

    <details>
        <summary>Defaults</summary>
        <div class="fields">
            ${textField('defaults', 'icon', defaults.icon as string || '', undefined, 'Icon')}
            ${selectField('defaults', 'default_screen', defaults.default_screen as string || '', ['None', ...Object.keys(screens).sort()], undefined, 'Default screen')}
        </div>
    </details>

    <details>
        <summary>Release</summary>
        <div class="fields">
            ${textField('release_info', 'location', releaseInfo.location as string || '', undefined, 'Location')}
            ${textField('release_info', 'hidden_imports', (releaseInfo.hidden_imports as string[] || []).join(', '), undefined, 'Hidden imports')}
        </div>
    </details>

    <details>
        <summary>Host</summary>
        <div class="fields">
            ${textField('host', 'script', host.script as string || '', undefined, 'Script')}
        </div>
    </details>

    <hr>
    <div class="screens-header">
        <h2>Screens</h2>
        <input type="text" id="newScreenName" placeholder="Screen name..." class="new-screen-input" style="display:none;">
        <button id="addScreenBtn" class="add-btn" title="Add Screen">+</button>
    </div>
    ${screenSections}

    <script>
        const vscode = acquireVsCodeApi();

        document.addEventListener('change', (e) => {
            const el = e.target;
            if (!(el instanceof HTMLInputElement) && !(el instanceof HTMLSelectElement)) return;

            const section = el.dataset.section;
            const field = el.dataset.field;
            const screen = el.dataset.screen || undefined;

            if (!section || !field) return;

            const value = (el instanceof HTMLInputElement && el.type === 'checkbox') ? el.checked : el.value;
            vscode.postMessage({ type: 'update', section, field, screen, value });
        });

        // Add screen button
        const addBtn = document.getElementById('addScreenBtn');
        const nameInput = document.getElementById('newScreenName');
        let adding = false;

        addBtn.addEventListener('click', () => {
            if (!adding) {
                adding = true;
                nameInput.style.display = '';
                nameInput.value = '';
                nameInput.focus();
            } else {
                submitNewScreen();
            }
        });

        nameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { submitNewScreen(); }
            if (e.key === 'Escape') { cancelAdd(); }
        });

        nameInput.addEventListener('blur', () => {
            setTimeout(() => {
                if (adding && !nameInput.value.trim()) { cancelAdd(); }
            }, 150);
        });

        function submitNewScreen() {
            const name = nameInput.value.trim();
            if (!name || !/^[A-Za-z_]\\w*$/.test(name)) {
                nameInput.style.borderColor = 'var(--vscode-inputValidation-errorBorder, red)';
                return;
            }
            vscode.postMessage({ type: 'addScreen', name });
            cancelAdd();
        }

        function cancelAdd() {
            adding = false;
            nameInput.style.display = 'none';
            nameInput.value = '';
        }

        // Debounce text inputs
        let debounceTimer;
        document.addEventListener('input', (e) => {
            const el = e.target;
            if (!(el instanceof HTMLInputElement) || el.type !== 'text') return;

            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                const section = el.dataset.section;
                const field = el.dataset.field;
                const screen = el.dataset.screen || undefined;

                if (!section || !field) return;
                vscode.postMessage({ type: 'update', section, field, screen, value: el.value });
            }, 500);
        });

        // Context menu on screen summaries
        let ctxMenu = null;
        let ctxScreen = null;

        document.addEventListener('contextmenu', (e) => {
            const summary = e.target.closest('summary[data-screen]');
            if (!summary) return;
            e.preventDefault();
            closeCtx();

            ctxScreen = summary.dataset.screen;
            ctxMenu = document.createElement('div');
            ctxMenu.className = 'ctx-menu';
            ctxMenu.innerHTML = '<div data-action="rename">Rename</div><hr><div data-action="delete" class="danger">Delete</div>';
            ctxMenu.style.left = e.clientX + 'px';
            ctxMenu.style.top = e.clientY + 'px';
            document.body.appendChild(ctxMenu);

            ctxMenu.addEventListener('click', (ev) => {
                const action = ev.target.dataset.action;
                if (action === 'rename') { promptRename(ctxScreen); }
                else if (action === 'delete') { confirmDelete(ctxScreen); }
                closeCtx();
            });
        });

        document.addEventListener('click', () => closeCtx());
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') { closeCtx(); }
        });

        function closeCtx() {
            if (ctxMenu) { ctxMenu.remove(); ctxMenu = null; ctxScreen = null; }
        }

        function promptRename(screenName) {
            const summary = document.querySelector('summary[data-screen="' + screenName + '"]');
            if (!summary) return;

            // Save original text, replace with input
            summary.textContent = '';
            const input = document.createElement('input');
            input.type = 'text';
            input.value = screenName;
            input.className = 'rename-input';
            summary.appendChild(input);

            // Block summary toggle only for non-input clicks
            function blockSummary(e) {
                if (e.target === summary) { e.preventDefault(); e.stopPropagation(); }
            }
            summary.addEventListener('click', blockSummary);

            let done = false;
            function finish(newName) {
                if (done) return;
                done = true;
                summary.removeEventListener('click', blockSummary);
                var finalName = (newName && newName !== screenName) ? newName : null;
                summary.textContent = finalName || screenName;
                summary.dataset.screen = finalName || screenName;
                if (finalName) {
                    vscode.postMessage({ type: 'renameScreen', oldName: screenName, newName: finalName });
                }
            }

            input.addEventListener('keydown', function(e) {
                e.stopPropagation();
                if (e.key === 'Enter') {
                    e.preventDefault();
                    finish(input.value.trim());
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    finish(null);
                }
            });

            input.addEventListener('blur', function() {
                setTimeout(function() { if (!done) finish(null); }, 200);
            });

            setTimeout(function() { input.focus(); input.select(); }, 50);
        }

        function confirmDelete(screenName) {
            if (confirm('Delete screen "' + screenName + '"? This will remove it from project.json and run VIS remove.')) {
                vscode.postMessage({ type: 'deleteScreen', name: screenName });
            }
        }

        // Delete key on focused screen section
        document.addEventListener('keydown', (e) => {
            if (e.key !== 'Delete') return;
            const active = document.activeElement;
            if (active && active.tagName === 'INPUT') return;
            const section = document.querySelector('details.screen-section[open]');
            if (section) {
                const name = section.dataset.screen;
                if (name) { confirmDelete(name); }
            }
        });
    </script>
</body>
</html>`;
}

function textField(section: string, field: string, value: string, screen?: string, label?: string): string {
    const screenAttr = screen ? ` data-screen="${screen}"` : '';
    return /* html */`
    <div class="field">
        <label>${label || field}</label>
        <input type="text" value="${escapeAttr(value)}" data-section="${section}" data-field="${field}"${screenAttr}>
    </div>`;
}

function selectField(section: string, field: string, value: string, options: string[], screen?: string, label?: string): string {
    const screenAttr = screen ? ` data-screen="${screen}"` : '';
    const optionsHtml = options.map(opt => {
        const optValue = opt === 'None' ? '' : opt;
        const selected = optValue === value ? ' selected' : '';
        return `<option value="${escapeAttr(optValue)}"${selected}>${escapeAttr(opt)}</option>`;
    }).join('');
    return /* html */`
    <div class="field">
        <label>${label || field}</label>
        <select data-section="${section}" data-field="${field}"${screenAttr}>${optionsHtml}</select>
    </div>`;
}

function checkbox(section: string, field: string, checked: boolean, screen?: string, label?: string): string {
    const screenAttr = screen ? ` data-screen="${screen}"` : '';
    const checkedAttr = checked ? ' checked' : '';
    const id = `${section}_${screen || ''}_${field}`;
    return /* html */`
    <div class="field">
        <label>${label || field}</label>
        <input type="checkbox" id="${id}"${checkedAttr} data-section="${section}" data-field="${field}"${screenAttr}>
    </div>`;
}

function escapeAttr(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function activateSettingsEditor(context: vscode.ExtensionContext) {
    const provider = new SettingsViewProvider(context);

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(SettingsViewProvider.viewType, provider)
    );

    // Refresh when project.json changes externally
    const watcher = vscode.workspace.createFileSystemWatcher('**/.VIS/project.json');
    const onProjectChange = () => provider.refresh();
    watcher.onDidChange(onProjectChange);
    watcher.onDidCreate(onProjectChange);
    watcher.onDidDelete(onProjectChange);
    context.subscriptions.push(watcher);
}
