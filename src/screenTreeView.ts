import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';

interface ScreenEntry {
    script?: string;
    tabbed?: boolean;
    release?: boolean;
    icon?: string | null;
    desc?: string;
    single_instance?: boolean;
    version?: string;
    current?: string | null;
    [key: string]: unknown;
}

interface ScreenData {
    entryPoint: string | null;
    elements: string[];
    modules: string[];
}

type ItemKind = 'screen' | 'category' | 'file';

class ScreenItem extends vscode.TreeItem {
    constructor(
        label: string,
        collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly kind: ItemKind,
        public readonly screenName?: string,
        public readonly filePath?: string
    ) {
        super(label, collapsibleState);
        switch (kind) {
            case 'screen':
                this.iconPath = new vscode.ThemeIcon('browser');
                this.contextValue = 'screen';
                break;
            case 'category':
                this.iconPath = new vscode.ThemeIcon('folder');
                this.contextValue = label === 'Elements' ? 'elements' : 'modules';
                break;
            case 'file':
                if (filePath) {
                    this.resourceUri = vscode.Uri.file(filePath);
                    this.command = {
                        command: 'vscode.open',
                        title: 'Open File',
                        arguments: [vscode.Uri.file(filePath)]
                    };
                }
                break;
        }
    }
}

class ScreenTreeProvider implements vscode.TreeDataProvider<ScreenItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<ScreenItem | undefined | null>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private projectRoot: string | null = null;
    private screens: Record<string, ScreenData> = {};
    private projectName = 'VIS';

    refresh() {
        this.loadProject();
        this._onDidChangeTreeData.fire(undefined);
    }

    getProjectName(): string {
        return this.projectName;
    }

    getProjectRoot(): string | null {
        return this.projectRoot;
    }

    hasProject(): boolean {
        return this.projectRoot !== null;
    }

    private loadProject() {
        this.screens = {};
        this.projectRoot = null;
        this.projectName = 'VIS';

        const folders = vscode.workspace.workspaceFolders;
        if (!folders) { return; }

        for (const folder of folders) {
            const jsonPath = path.join(folder.uri.fsPath, '.VIS', 'project.json');
            if (!fs.existsSync(jsonPath)) { continue; }

            this.projectRoot = folder.uri.fsPath;
            let raw: Record<string, unknown>;
            try {
                raw = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
            } catch { return; }

            const projectKey = Object.keys(raw)[0];
            if (!projectKey) { return; }
            const project = raw[projectKey] as Record<string, unknown>;
            this.projectName = `VIS: ${projectKey}`;

            const screensObj = project.Screens as Record<string, ScreenEntry> | undefined;
            if (!screensObj) { return; }

            for (const [screenName, entry] of Object.entries(screensObj)) {
                if (!entry || typeof entry.script !== 'string') { continue; }

                const data: ScreenData = { entryPoint: null, elements: [], modules: [] };

                // Entry-point script
                const scriptPath = path.resolve(this.projectRoot, entry.script);
                if (fs.existsSync(scriptPath)) {
                    data.entryPoint = scriptPath;
                }

                // Screens/{Name}/ → elements
                const screensDir = path.join(this.projectRoot, 'Screens', screenName);
                if (fs.existsSync(screensDir)) {
                    for (const f of fs.readdirSync(screensDir).sort()) {
                        if (f.endsWith('.py')) {
                            data.elements.push(path.join(screensDir, f));
                        }
                    }
                }

                // modules/{Name}/ → modules
                const modulesDir = path.join(this.projectRoot, 'modules', screenName);
                if (fs.existsSync(modulesDir)) {
                    for (const f of fs.readdirSync(modulesDir).sort()) {
                        if (f.endsWith('.py')) {
                            data.modules.push(path.join(modulesDir, f));
                        }
                    }
                }

                this.screens[screenName] = data;
            }
            break;
        }
    }

    getTreeItem(element: ScreenItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: ScreenItem): ScreenItem[] {
        if (!this.projectRoot) {
            this.loadProject();
            if (!this.projectRoot) { return []; }
        }

        // Root: list screens
        if (!element) {
            return Object.keys(this.screens).sort().map(name =>
                new ScreenItem(name, vscode.TreeItemCollapsibleState.Collapsed, 'screen', name)
            );
        }

        // Screen level: entry point + Elements/Modules categories
        if (element.kind === 'screen') {
            const data = this.screens[element.screenName!];
            if (!data) { return []; }

            const children: ScreenItem[] = [];

            if (data.entryPoint) {
                const name = path.basename(data.entryPoint);
                children.push(new ScreenItem(name, vscode.TreeItemCollapsibleState.None, 'file', element.screenName, data.entryPoint));
            }
            if (data.elements.length > 0) {
                children.push(new ScreenItem('Elements', vscode.TreeItemCollapsibleState.Collapsed, 'category', element.screenName));
            }
            if (data.modules.length > 0) {
                children.push(new ScreenItem('Modules', vscode.TreeItemCollapsibleState.Collapsed, 'category', element.screenName));
            }

            return children;
        }

        // Category level: list files
        if (element.kind === 'category') {
            const data = this.screens[element.screenName!];
            if (!data) { return []; }

            const files = element.label === 'Elements' ? data.elements : data.modules;
            return files.map(filePath => {
                const name = path.basename(filePath);
                return new ScreenItem(name, vscode.TreeItemCollapsibleState.None, 'file', element.screenName, filePath);
            });
        }

        return [];
    }
}

// ── Shell helpers ────────────────────────────────────────────────────

let visTerminal: vscode.Terminal | undefined;

function getVISTerminal(cwd: string): vscode.Terminal {
    if (visTerminal && !visTerminal.exitStatus) {
        return visTerminal;
    }
    visTerminal = vscode.window.createTerminal({ name: 'VIS', cwd });
    return visTerminal;
}

function sendToTerminal(cwd: string, command: string) {
    const term = getVISTerminal(cwd);
    term.show();
    term.sendText(command);
}

function runPython(cwd: string, code: string): Promise<string> {
    const escaped = code.replace(/"/g, '\\"');
    return new Promise((resolve, reject) => {
        exec(`python -c "${escaped}"`, { cwd }, (err, stdout, stderr) => {
            if (err) {
                reject(new Error(stderr.trim() || err.message));
            } else {
                resolve(stdout.trim());
            }
        });
    });
}

const NAME_PATTERN = /^[A-Za-z_]\w*$/;

function validateScreenName(v: string): string | undefined {
    if (!v || !v.trim()) { return 'Name cannot be empty'; }
    if (!NAME_PATTERN.test(v.trim())) { return 'Must be a valid Python identifier'; }
    return undefined;
}

// ── Commands ─────────────────────────────────────────────────────────

async function createScreen(provider: ScreenTreeProvider) {
    const root = provider.getProjectRoot();
    if (!root) {
        vscode.window.showWarningMessage('No VIStk project found in the workspace.');
        return;
    }

    const name = await vscode.window.showInputBox({
        prompt: 'Screen name',
        placeHolder: 'MyScreen',
        validateInput: validateScreenName
    });
    if (!name) { return; }

    sendToTerminal(root, `VIS add screen ${name.trim()}`);
}

async function renameScreen(provider: ScreenTreeProvider, item: ScreenItem) {
    const root = provider.getProjectRoot();
    const oldName = item.screenName;
    if (!root || !oldName) { return; }

    const newName = await vscode.window.showInputBox({
        prompt: `Rename "${oldName}" to`,
        value: oldName,
        validateInput: v => {
            const base = validateScreenName(v);
            if (base) { return base; }
            if (v.trim() === oldName) { return 'Name is the same'; }
            return undefined;
        }
    });
    if (!newName) { return; }

    sendToTerminal(root, `VIS rename ${oldName} ${newName.trim()}`);
}

const EDITABLE_ATTRS: { label: string; attr: string; description: string }[] = [
    { label: 'tabbed',          attr: 'tabbed',          description: 'Open as Host tab (true/false)' },
    { label: 'release',         attr: 'release',         description: 'Include in release builds (true/false)' },
    { label: 'icon',            attr: 'icon',            description: 'Icon name (or None)' },
    { label: 'desc',            attr: 'desc',            description: 'Screen description' },
    { label: 'single_instance', attr: 'single_instance', description: 'Only one instance allowed (true/false)' },
    { label: 'version',         attr: 'version',         description: 'Version string (major.minor.patch)' },
    { label: 'script',          attr: 'script',          description: 'Entry-point script filename' },
];

async function editScreen(provider: ScreenTreeProvider, item: ScreenItem) {
    const root = provider.getProjectRoot();
    const screenName = item.screenName;
    if (!root || !screenName) { return; }

    const picked = await vscode.window.showQuickPick(EDITABLE_ATTRS, {
        placeHolder: `Edit attribute of "${screenName}"`,
    });
    if (!picked) { return; }

    const value = await vscode.window.showInputBox({
        prompt: `${screenName} → ${picked.attr}`,
        placeHolder: picked.description,
    });
    if (value === undefined) { return; }

    sendToTerminal(root, `VIS edit ${screenName} ${picked.attr} ${value}`);
}

async function addElement(provider: ScreenTreeProvider, item: ScreenItem) {
    const root = provider.getProjectRoot();
    const screenName = item.screenName;
    if (!root || !screenName) { return; }

    const input = await vscode.window.showInputBox({
        prompt: `Element name (creates f_<name>.py + m_<name>.py for "${screenName}")`,
        placeHolder: 'header',
        validateInput: validateScreenName
    });
    if (!input) { return; }

    const name = input.trim();

    try {
        await runPython(root,
            `from VIStk.Structures._Project import Project; ` +
            `Project().getScreen('${screenName}').addElement('${name}')`
        );
        provider.refresh();
        vscode.window.showInformationMessage(`Element "${name}" added to "${screenName}".`);

        // Open the element file if it was created
        const elemPath = path.join(root, 'Screens', screenName, `f_${name}.py`);
        if (fs.existsSync(elemPath)) {
            const doc = await vscode.workspace.openTextDocument(elemPath);
            await vscode.window.showTextDocument(doc);
        }
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        vscode.window.showErrorMessage(`Failed to add element: ${msg}`);
    }
}

// ── Activation ───────────────────────────────────────────────────────

export function activateScreenTreeView(context: vscode.ExtensionContext) {
    const provider = new ScreenTreeProvider();
    provider.refresh();

    const treeView = vscode.window.createTreeView('visScreens', {
        treeDataProvider: provider
    });
    treeView.title = provider.getProjectName();
    vscode.commands.executeCommand('setContext', 'viscode.hasProject', provider.hasProject());

    // Watch for project.json changes
    const watcher = vscode.workspace.createFileSystemWatcher('**/.VIS/project.json');
    const onProjectChange = () => {
        provider.refresh();
        treeView.title = provider.getProjectName();
        vscode.commands.executeCommand('setContext', 'viscode.hasProject', provider.hasProject());
    };
    watcher.onDidChange(onProjectChange);
    watcher.onDidCreate(onProjectChange);
    watcher.onDidDelete(onProjectChange);

    // Register commands
    context.subscriptions.push(
        treeView,
        watcher,
        vscode.commands.registerCommand('viscode.createScreen', () => createScreen(provider)),
        vscode.commands.registerCommand('viscode.renameScreen', (item: ScreenItem) => renameScreen(provider, item)),
        vscode.commands.registerCommand('viscode.editScreen', (item: ScreenItem) => editScreen(provider, item)),
        vscode.commands.registerCommand('viscode.addElement', (item: ScreenItem) => addElement(provider, item)),
    );
}
