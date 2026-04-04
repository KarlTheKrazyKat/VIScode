import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

interface ScreenEntry {
    script?: string;
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
                break;
            case 'category':
                this.iconPath = new vscode.ThemeIcon('folder');
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

    context.subscriptions.push(treeView, watcher);
}
