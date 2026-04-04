import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

const DIAGNOSTIC_SOURCE = 'VIS';

/** Functions every VIStk screen script must define. */
const REQUIRED_FUNCTIONS = ['setup', 'loop', 'configure_menu', 'on_focused', 'on_unfocused'] as const;

/** Patterns that indicate widget creation or Tk calls that must not appear at module level. */
const WIDGET_CALL_PATTERNS: RegExp[] = [
    /\bttk\.\w+\s*\(/,
    /\btk\.\w+\s*\(/,
    /\btkinter\.\w+\s*\(/,
    /\bLayoutFrame\s*\(/,
    /\bStringVar\s*\(/,
    /\bIntVar\s*\(/,
    /\bDoubleVar\s*\(/,
    /\bBooleanVar\s*\(/,
    /\bPhotoImage\s*\(/,
    /\.pack\s*\(/,
    /\.place\s*\(/,
    /\.grid\s*\(/,
    /\.config\s*\(/,
    /\.configure\s*\(/,
];

// ── Scope tracking ──────────────────────────────────────────────────

interface ScopeInfo {
    kind: 'function' | 'class' | 'if_main';
    indent: number;
    name?: string;
}

/**
 * Determines whether a given line sits at module level (not inside any
 * function, class, or `if __name__` block).
 *
 * Uses a simple indent-based scope stack — good enough for the
 * well-structured screen files VIStk expects.
 */
function buildScopeStack(document: vscode.TextDocument, targetLine: number): ScopeInfo[] {
    const stack: ScopeInfo[] = [];

    for (let i = 0; i <= targetLine; i++) {
        const text = document.lineAt(i).text;
        const stripped = text.trimStart();

        // Skip blanks and comments
        if (stripped.length === 0 || stripped.startsWith('#')) { continue; }

        const indent = text.length - stripped.length;

        // Pop scopes that are no longer enclosing (de-dented past them)
        while (stack.length > 0 && indent <= stack[stack.length - 1].indent) {
            stack.pop();
        }

        // Push new scopes
        const defMatch = stripped.match(/^def\s+(\w+)\s*\(/);
        if (defMatch) {
            stack.push({ kind: 'function', indent, name: defMatch[1] });
            continue;
        }
        const classMatch = stripped.match(/^class\s+(\w+)/);
        if (classMatch) {
            stack.push({ kind: 'class', indent, name: classMatch[1] });
            continue;
        }
        if (/^if\s+__name__\s*==\s*['"]__main__['"]\s*:/.test(stripped)) {
            stack.push({ kind: 'if_main', indent });
            continue;
        }
    }

    return stack;
}

function isModuleLevel(document: vscode.TextDocument, line: number): boolean {
    return buildScopeStack(document, line).length === 0;
}

// ── Screen file detection ───────────────────────────────────────────

/**
 * Returns true if the file belongs to a VIStk project AND is a screen
 * entry-point script (listed in project.json's Screens dict).
 */
function isScreenEntryPoint(document: vscode.TextDocument): boolean {
    const filePath = document.uri.fsPath;
    const folders = vscode.workspace.workspaceFolders;
    if (!folders) { return false; }

    for (const folder of folders) {
        const jsonPath = path.join(folder.uri.fsPath, '.VIS', 'project.json');
        if (!fs.existsSync(jsonPath)) { continue; }

        try {
            const raw: Record<string, unknown> = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
            const projectKey = Object.keys(raw)[0];
            if (!projectKey) { continue; }

            const project = raw[projectKey] as Record<string, unknown>;
            const screens = project.Screens as Record<string, { script?: string }> | undefined;
            if (!screens) { continue; }

            for (const entry of Object.values(screens)) {
                if (typeof entry.script === 'string') {
                    const abs = path.resolve(folder.uri.fsPath, entry.script);
                    if (abs.toLowerCase() === filePath.toLowerCase()) {
                        return true;
                    }
                }
            }
        } catch {
            continue;
        }
    }

    return false;
}

/**
 * Returns true if the file lives inside a VIStk project
 * (any .py file under a workspace folder containing .VIS/project.json).
 */
function isInVISProject(document: vscode.TextDocument): boolean {
    const filePath = document.uri.fsPath;
    const folders = vscode.workspace.workspaceFolders;
    if (!folders) { return false; }

    for (const folder of folders) {
        const jsonPath = path.join(folder.uri.fsPath, '.VIS', 'project.json');
        if (fs.existsSync(jsonPath) && filePath.toLowerCase().startsWith(folder.uri.fsPath.toLowerCase())) {
            return true;
        }
    }
    return false;
}

// ── Diagnostic checks ───────────────────────────────────────────────

function checkMissingFunctions(document: vscode.TextDocument): vscode.Diagnostic[] {
    const diagnostics: vscode.Diagnostic[] = [];
    const text = document.getText();

    for (const fn of REQUIRED_FUNCTIONS) {
        // Match top-level def (no leading whitespace)
        const pattern = new RegExp(`^def\\s+${fn}\\s*\\(`, 'm');
        if (!pattern.test(text)) {
            // Span the entire first line so the squiggle is visible
            const firstLine = document.lineAt(0);
            const range = firstLine.range;
            const diag = new vscode.Diagnostic(
                range,
                `Screen is missing required function: ${fn}()`,
                vscode.DiagnosticSeverity.Warning
            );
            diag.source = DIAGNOSTIC_SOURCE;
            diag.code = `missing-${fn}`;
            diagnostics.push(diag);
        }
    }

    return diagnostics;
}

function checkModuleLevelWidgets(document: vscode.TextDocument): vscode.Diagnostic[] {
    const diagnostics: vscode.Diagnostic[] = [];

    for (let i = 0; i < document.lineCount; i++) {
        const line = document.lineAt(i);
        const text = line.text;
        const stripped = text.trimStart();

        // Skip blanks, comments, and imports
        if (stripped.length === 0 || stripped.startsWith('#') || stripped.startsWith('import ') || stripped.startsWith('from ')) {
            continue;
        }

        // Only flag module-level lines
        if (!isModuleLevel(document, i)) { continue; }

        for (const pattern of WIDGET_CALL_PATTERNS) {
            if (pattern.test(stripped)) {
                const diag = new vscode.Diagnostic(
                    line.range,
                    'Widget creation at module level — move inside setup() or build()',
                    vscode.DiagnosticSeverity.Error
                );
                diag.source = DIAGNOSTIC_SOURCE;
                diag.code = 'module-level-widget';
                diagnostics.push(diag);
                break; // one diagnostic per line
            }
        }
    }

    return diagnostics;
}

// ── Public API ──────────────────────────────────────────────────────

function analyzeDocument(document: vscode.TextDocument, collection: vscode.DiagnosticCollection) {
    // Only analyze Python files inside a VIStk project
    if (document.languageId !== 'python' || !isInVISProject(document)) {
        collection.delete(document.uri);
        return;
    }

    const diagnostics: vscode.Diagnostic[] = [];

    // Module-level widget checks apply to all project Python files
    diagnostics.push(...checkModuleLevelWidgets(document));

    // Missing-function checks only apply to screen entry points and element files
    if (isScreenEntryPoint(document)) {
        diagnostics.push(...checkMissingFunctions(document));
    }

    collection.set(document.uri, diagnostics);
}

export function activateDiagnostics(context: vscode.ExtensionContext) {
    const collection = vscode.languages.createDiagnosticCollection('vis');
    context.subscriptions.push(collection);

    // Analyze on open, save, and edit
    context.subscriptions.push(
        vscode.workspace.onDidOpenTextDocument(doc => analyzeDocument(doc, collection)),
        vscode.workspace.onDidSaveTextDocument(doc => analyzeDocument(doc, collection)),
        vscode.workspace.onDidChangeTextDocument(e => analyzeDocument(e.document, collection)),
        vscode.workspace.onDidCloseTextDocument(doc => collection.delete(doc.uri)),
    );

    // Analyze all currently open documents
    for (const doc of vscode.workspace.textDocuments) {
        analyzeDocument(doc, collection);
    }
}
