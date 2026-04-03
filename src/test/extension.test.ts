import * as assert from 'assert';
import * as vscode from 'vscode';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Open a scratch Python document, place the cursor selection over `word`,
 * run `commandId`, and return the full document text after the edit.
 */
async function runCommandOnWord(
    commandId: string,
    word: string,
    fileName: string = 'f_test.py'
): Promise<string> {
    const uri = vscode.Uri.parse(`untitled:${fileName}`);
    const doc = await vscode.workspace.openTextDocument(uri);

    await vscode.languages.setTextDocumentLanguage(doc, 'python');

    const editor = await vscode.window.showTextDocument(doc);

    await editor.edit(edit => {
        edit.insert(new vscode.Position(0, 0), word);
    });

    const start = new vscode.Position(0, 0);
    const end = new vscode.Position(0, word.length);
    editor.selection = new vscode.Selection(start, end);

    await vscode.commands.executeCommand(commandId);

    return doc.getText();
}

/**
 * Open a document pre-populated with `preamble` (multiple lines), then
 * insert `word` on the next line with `indent` leading spaces, select `word`,
 * run `commandId`, and return the full document text after the edit.
 */
async function runCommandWithContext(
    commandId: string,
    preamble: string,
    word: string,
    indent: string = '',
    fileName: string = 'f_ctx.py'
): Promise<string> {
    const uri = vscode.Uri.parse(`untitled:${fileName}`);
    const doc = await vscode.workspace.openTextDocument(uri);
    await vscode.languages.setTextDocumentLanguage(doc, 'python');
    const editor = await vscode.window.showTextDocument(doc);

    const fullText = preamble + '\n' + indent + word;
    await editor.edit(edit => {
        edit.insert(new vscode.Position(0, 0), fullText);
    });

    const wordLine = doc.lineCount - 1;
    const wordCol  = indent.length;
    editor.selection = new vscode.Selection(
        new vscode.Position(wordLine, wordCol),
        new vscode.Position(wordLine, wordCol + word.length)
    );

    await vscode.commands.executeCommand(commandId);

    return doc.getText();
}

async function closeAll(): Promise<void> {
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

suite('VIScode 0.1.0 — Snippet Generation', () => {

    suiteSetup(async () => {
        const ext = vscode.extensions.getExtension('KarlTheKrazyKat.vis');
        if (ext && !ext.isActive) {
            await ext.activate();
        }
    });

    teardown(async () => {
        await closeAll();
    });

    // -----------------------------------------------------------------------
    // addLabel  (shift+alt+L)
    // -----------------------------------------------------------------------
    suite('addLabel', () => {

        test('generates vl_ prefix, ttk.Label, and .place() line', async () => {
            const result = await runCommandOnWord('viscode.addLabel', 'myWidget', 'f_sample.py');
            assert.ok(
                result.includes('vl_myWidget = ttk.Label(f_elem,'),
                `Expected "vl_myWidget = ttk.Label(f_elem, ..." but got:\n${result}`
            );
            assert.ok(
                result.includes('vl_myWidget.place(f_sample.Layout.cell(1, 1))'),
                `Expected ".place(f_sample.Layout.cell(1, 1))" but got:\n${result}`
            );
        });

        test('root name is derived from file name without extension', async () => {
            const result = await runCommandOnWord('viscode.addLabel', 'x', 'f_dashboard.py');
            assert.ok(
                result.includes('.place(f_dashboard.Layout.cell(1, 1))'),
                `Root should be "f_dashboard" for file "f_dashboard.py", got:\n${result}`
            );
        });

        test('default text attribute is "VIS Label"', async () => {
            const result = await runCommandOnWord('viscode.addLabel', 'lbl', 'f_test.py');
            assert.ok(result.includes('text="VIS Label"'));
        });

        test('snippet spans exactly two lines', async () => {
            const result = await runCommandOnWord('viscode.addLabel', 'lbl', 'f_test.py');
            const lines = result.split('\n').filter(l => l.trim() !== '');
            assert.strictEqual(lines.length, 2, `Expected 2 non-empty lines, got ${lines.length}:\n${result}`);
        });
    });

    // -----------------------------------------------------------------------
    // addButton  (shift+alt+B)
    // -----------------------------------------------------------------------
    suite('addButton', () => {

        test('generates vb_ prefix, ttk.Button, and .place() line', async () => {
            const result = await runCommandOnWord('viscode.addButton', 'save', 'f_editor.py');
            assert.ok(result.includes('vb_save = ttk.Button(f_elem,'));
            assert.ok(result.includes('vb_save.place(f_editor.Layout.cell(1, 1))'));
        });

        test('default text attribute is "VIS Button"', async () => {
            const result = await runCommandOnWord('viscode.addButton', 'btn', 'f_test.py');
            assert.ok(result.includes('text="VIS Button"'));
        });

        test('command parameter placeholder is "command=None"', async () => {
            const result = await runCommandOnWord('viscode.addButton', 'btn', 'f_test.py');
            assert.ok(result.includes('command=None'));
        });

        test('uses ttk.Button (not bare Button)', async () => {
            const result = await runCommandOnWord('viscode.addButton', 'btn', 'f_test.py');
            assert.ok(result.includes('ttk.Button'), 'addButton must use ttk.Button');
            assert.ok(!result.includes(' Button('), 'addButton must NOT use bare Button()');
        });
    });

    // -----------------------------------------------------------------------
    // addEntry  (shift+alt+E)
    // -----------------------------------------------------------------------
    suite('addEntry', () => {

        test('generates ve_ prefix, ttk.Entry, and .place() line', async () => {
            const result = await runCommandOnWord('viscode.addEntry', 'partNum', 'f_parts.py');
            assert.ok(result.includes('ve_partNum = ttk.Entry(f_elem,'));
            assert.ok(result.includes('ve_partNum.place(f_parts.Layout.cell(1, 1))'));
        });

        test('textvariable placeholder is "textvariable=stringvar"', async () => {
            const result = await runCommandOnWord('viscode.addEntry', 'e', 'f_test.py');
            assert.ok(result.includes('textvariable=stringvar'));
        });
    });

    // -----------------------------------------------------------------------
    // addCombobox  (shift+alt+M)
    // -----------------------------------------------------------------------
    suite('addCombobox', () => {

        test('generates vc_ prefix, ttk.Combobox, and .place() line', async () => {
            const result = await runCommandOnWord('viscode.addCombobox', 'status', 'f_wo.py');
            assert.ok(result.includes('vc_status = ttk.Combobox(f_elem,'));
            assert.ok(result.includes('vc_status.place(f_wo.Layout.cell(1, 1))'));
        });

        test('values placeholder is "values=list"', async () => {
            const result = await runCommandOnWord('viscode.addCombobox', 'cb', 'f_test.py');
            assert.ok(result.includes('values=list'));
        });
    });

    // -----------------------------------------------------------------------
    // addCommandButton  (shift+alt+K)  — NEW in 0.1.0
    // -----------------------------------------------------------------------
    suite('addCommandButton', () => {

        test('generates cb_ prefix and .place() line', async () => {
            const result = await runCommandOnWord('viscode.addCommandButton', 'run', 'f_machine.py');
            assert.ok(result.includes('cb_run = Button(f_elem,'));
            assert.ok(result.includes('cb_run.place(f_machine.Layout.cell(1, 1))'));
        });

        test('uses bare Button (NOT ttk.Button)', async () => {
            const result = await runCommandOnWord('viscode.addCommandButton', 'run', 'f_test.py');
            assert.ok(
                !result.includes('ttk.Button'),
                `addCommandButton must use bare Button(), not ttk.Button, but got:\n${result}`
            );
            assert.ok(
                result.includes('= Button('),
                `addCommandButton must use bare Button() constructor, got:\n${result}`
            );
        });

        test('foreground is wColors.Highlight', async () => {
            const result = await runCommandOnWord('viscode.addCommandButton', 'run', 'f_test.py');
            assert.ok(result.includes('foreground=wColors.Highlight'));
        });

        test('background is wColors.GreyButton', async () => {
            const result = await runCommandOnWord('viscode.addCommandButton', 'run', 'f_test.py');
            assert.ok(result.includes('background=wColors.GreyButton'));
        });

        test('command parameter placeholder is "command=None"', async () => {
            const result = await runCommandOnWord('viscode.addCommandButton', 'run', 'f_test.py');
            assert.ok(result.includes('command=None'));
        });

        test('default text attribute is "VIS Button"', async () => {
            const result = await runCommandOnWord('viscode.addCommandButton', 'run', 'f_test.py');
            assert.ok(result.includes('text="VIS Button"'));
        });

        test('snippet spans exactly two lines', async () => {
            const result = await runCommandOnWord('viscode.addCommandButton', 'run', 'f_test.py');
            const lines = result.split('\n').filter(l => l.trim() !== '');
            assert.strictEqual(lines.length, 2);
        });
    });

    // -----------------------------------------------------------------------
    // Root name derivation
    // -----------------------------------------------------------------------
    suite('Root name derivation from filename', () => {

        test('strips .py extension only', async () => {
            const result = await runCommandOnWord('viscode.addLabel', 'w', 'f_test.py');
            assert.ok(result.includes('f_test.Layout.cell'));
            assert.ok(!result.includes('f_test.py.Layout'));
        });

        test('file name with underscores is preserved intact', async () => {
            const result = await runCommandOnWord('viscode.addButton', 'w', 'f_work_order_editor.py');
            assert.ok(result.includes('f_work_order_editor.Layout.cell'));
        });
    });

    // -----------------------------------------------------------------------
    // showMessages config gating
    // -----------------------------------------------------------------------
    suite('viscode.showMessages configuration', () => {

        test('config key exists and defaults to true', async () => {
            const config = vscode.workspace.getConfiguration('viscode');
            const val = config.get<boolean>('showMessages');
            assert.strictEqual(val, true, 'showMessages should default to true');
        });

        test('no information message shown when showMessages is false', async () => {
            await vscode.workspace.getConfiguration('viscode').update(
                'showMessages',
                false,
                vscode.ConfigurationTarget.Global
            );

            let messageShown = false;
            const disposable = (vscode.window as any).onDidShowMessage?.(() => {
                messageShown = true;
            });

            await runCommandOnWord('viscode.addLabel', 'w', 'f_test.py');

            await vscode.workspace.getConfiguration('viscode').update(
                'showMessages',
                true,
                vscode.ConfigurationTarget.Global
            );
            disposable?.dispose();

            if (disposable) {
                assert.strictEqual(messageShown, false);
            }
        });
    });

    // -----------------------------------------------------------------------
    // Manifest consistency
    // -----------------------------------------------------------------------
    suite('Manifest consistency', () => {

        test('extension publisher is KarlTheKrazyKat', async () => {
            const ext = vscode.extensions.getExtension('KarlTheKrazyKat.vis');
            assert.ok(ext, 'Extension KarlTheKrazyKat.vis should be present in test host');
        });

        test('all 5 commands are registered and executable', async () => {
            const cmds = await vscode.commands.getCommands(true);
            const expected = [
                'viscode.addLabel',
                'viscode.addButton',
                'viscode.addEntry',
                'viscode.addCombobox',
                'viscode.addCommandButton',
            ];
            for (const id of expected) {
                assert.ok(cmds.includes(id), `Command "${id}" should be registered`);
            }
        });
    });

    // -----------------------------------------------------------------------
    // Indentation preservation
    // -----------------------------------------------------------------------
    suite('Indentation preservation', () => {

        test('second line inherits 4-space indent from cursor line', async () => {
            const result = await runCommandWithContext(
                'viscode.addLabel',
                '',
                'myLbl',
                '    ',
                'f_ind.py'
            );
            const lines = result.split('\n').filter(l => l.trim() !== '');
            assert.strictEqual(lines.length, 2, `Expected 2 non-empty lines, got:\n${result}`);
            assert.ok(
                lines[1].startsWith('    '),
                `Second line should start with 4 spaces, got: "${lines[1]}"`
            );
        });

        test('second line inherits tab indent', async () => {
            const result = await runCommandWithContext(
                'viscode.addButton',
                '',
                'myBtn',
                '\t',
                'f_ind2.py'
            );
            const lines = result.split('\n').filter(l => l.trim() !== '');
            assert.ok(
                lines[1].startsWith('\t'),
                `Second line should start with a tab, got: "${lines[1]}"`
            );
        });
    });

    // -----------------------------------------------------------------------
    // Frame detection — tkinter grid
    // -----------------------------------------------------------------------
    suite('Frame detection — tkinter grid', () => {

        const gridPreamble = [
            'def build(parent):',
            '    global f_main',
            '    f_main = ttk.Frame(parent)',
            '    f_main.grid(column=0, row=0)',
            '    f_main.columnconfigure(1, weight=1)',
            '    f_main.rowconfigure(1, weight=1)',
        ].join('\n');

        test('uses detected frame name as widget parent', async () => {
            const result = await runCommandWithContext(
                'viscode.addLabel',
                gridPreamble,
                'title',
                '    ',
                'f_grid.py'
            );
            assert.ok(
                result.includes('ttk.Label(f_main,'),
                `Expected parent "f_main" in:\n${result}`
            );
        });

        test('emits .grid() placement for a grid frame', async () => {
            const result = await runCommandWithContext(
                'viscode.addLabel',
                gridPreamble,
                'title',
                '    ',
                'f_grid2.py'
            );
            assert.ok(
                result.includes('.grid(row=0, column=0,'),
                `Expected .grid() placement in:\n${result}`
            );
            assert.ok(
                !result.includes('.place('),
                `Should NOT emit .place() for a grid frame:\n${result}`
            );
        });
    });

    // -----------------------------------------------------------------------
    // Frame detection — VIStk LayoutFrame
    // -----------------------------------------------------------------------
    suite('Frame detection — VIStk LayoutFrame', () => {

        const layoutPreamble = [
            'def setup(parent):',
            '    from VIStk.Widgets import LayoutFrame',
            '    pane = LayoutFrame(parent)',
            '    pane.place(relx=0, rely=0, relwidth=1, relheight=1)',
        ].join('\n');

        test('uses detected frame name as widget parent', async () => {
            const result = await runCommandWithContext(
                'viscode.addLabel',
                layoutPreamble,
                'title',
                '    ',
                'f_layout.py'
            );
            assert.ok(
                result.includes('ttk.Label(pane,'),
                `Expected parent "pane" in:\n${result}`
            );
        });

        test('emits .place(frameName.Layout.cell()) for a LayoutFrame', async () => {
            const result = await runCommandWithContext(
                'viscode.addLabel',
                layoutPreamble,
                'title',
                '    ',
                'f_layout2.py'
            );
            assert.ok(
                result.includes('.place(pane.Layout.cell(1, 1))'),
                `Expected .place(pane.Layout.cell(1, 1)) in:\n${result}`
            );
        });
    });
});
