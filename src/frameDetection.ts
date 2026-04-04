import * as vscode from 'vscode';

export interface FrameInfo {
    name: string;
    type: 'layout' | 'grid';
    definedAtLine: number;
}

/** Returns the leading whitespace of a line (tabs or spaces). */
export function getLineIndent(document: vscode.TextDocument, lineNumber: number): string {
    return document.lineAt(lineNumber).text.match(/^(\s*)/)?.[1] ?? '';
}

/**
 * Searches backward from `cursorLine` to find the innermost frame definition.
 * - `LayoutFrame(` → VIStk layout frame
 * - `ttk.Frame(` with a subsequent `.columnconfigure()` or `.rowconfigure()` → tkinter grid frame
 * Returns null if nothing is found.
 */
export function detectFrame(document: vscode.TextDocument, cursorLine: number): FrameInfo | null {
    const layoutFrameRe = /(\w+)\s*=\s*LayoutFrame\(/;
    const ttkFrameRe    = /(\w+)\s*=\s*ttk\.Frame\(/;

    for (let i = cursorLine; i >= 0; i--) {
        const line = document.lineAt(i).text;

        const lm = layoutFrameRe.exec(line);
        if (lm) {
            return { name: lm[1], type: 'layout', definedAtLine: i };
        }

        const tm = ttkFrameRe.exec(line);
        if (tm) {
            const frameName = tm[1];
            for (let j = i + 1; j <= cursorLine; j++) {
                const jLine = document.lineAt(j).text;
                if (jLine.includes(frameName + '.columnconfigure(') ||
                    jLine.includes(frameName + '.rowconfigure(')) {
                    return { name: frameName, type: 'grid', definedAtLine: i };
                }
            }
            return { name: frameName, type: 'grid', definedAtLine: i };
        }
    }
    return null;
}

/**
 * Scans the lines between the frame definition and the cursor to find the
 * next available placement position.
 *
 * Grid:   looks for `.grid(row=X, ...)` calls — next row = max + 1, col = 0
 * Layout: looks for `frameName.Layout.cell(X, Y)` calls — next row = max + 1, col = 1 (1-indexed)
 */
export function detectNextPosition(
    document: vscode.TextDocument,
    frame: FrameInfo,
    cursorLine: number
): { row: number; col: number } {
    if (frame.type === 'grid') {
        const rowRe = /\.grid\([^)]*\brow\s*=\s*(\d+)/;
        const colConfigRe = new RegExp(frame.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\.columnconfigure\\(\\s*(\\d+)');
        let maxRow = -1;
        let startCol = 0;
        for (let i = frame.definedAtLine + 1; i < cursorLine; i++) {
            const line = document.lineAt(i).text;
            const m = rowRe.exec(line);
            if (m) { maxRow = Math.max(maxRow, parseInt(m[1], 10)); }
            const cc = colConfigRe.exec(line);
            if (cc && startCol === 0) { startCol = parseInt(cc[1], 10); }
        }
        return { row: maxRow + 1, col: startCol };
    } else {
        const escaped = frame.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const cellRe  = new RegExp(escaped + '\\.Layout\\.cell\\((\\d+),\\s*(\\d+)\\)');
        let maxRow = 0;
        for (let i = frame.definedAtLine + 1; i < cursorLine; i++) {
            const m = cellRe.exec(document.lineAt(i).text);
            if (m) { maxRow = Math.max(maxRow, parseInt(m[1], 10)); }
        }
        return { row: maxRow + 1, col: 1 };
    }
}

/**
 * Builds the placement line for a widget.
 * - VIStk layout: `widget.place(frameName.Layout.cell(row, col))`
 * - tkinter grid:  `widget.grid(row=R, column=C, sticky=(N, S, E, W))`
 */
export function makePlacementLine(
    widgetVar: string,
    frame: FrameInfo | null,
    fallbackLayout: string,
    indent: string,
    pos: { row: number; col: number }
): string {
    if (frame === null || frame.type === 'layout') {
        const ref = frame ? frame.name : fallbackLayout;
        return `${indent}${widgetVar}.place(${ref}.Layout.cell(${pos.row}, ${pos.col}))`;
    }
    return `${indent}${widgetVar}.grid(row=${pos.row}, column=${pos.col}, sticky=(N, S, E, W))`;
}
