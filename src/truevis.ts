// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs';
import { exec } from 'child_process';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    
    let path = new Promise<string>((resolve,reject) => {
        exec('python -c "import os, sys; print(os.path.dirname(sys.executable))"',(error,stdout,stderr) => {
            if(error){
                reject(`Error: ${error.message}`);
                return;
            }
            if(stdout){
                reject(`Stderr:${stderr}`);
                return;
            }
            resolve(stdout);
        });
    });
    
    console.log(String(path));
}

// This method is called when your extension is deactivated
export function deactivate() {}
