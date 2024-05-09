// Populate hover  provider.

import * as vscode from "vscode";
import * as id from './intellisensedata';

class CMakeHoverProvider implements vscode.HoverProvider {
    provideHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.ProviderResult<vscode.Hover> {
        // get tooltip for span
        const data = id.IntellisenseData.getInstance();
        // get span
        // data.getTooltipForText();
        return new vscode.Hover("MY HOVER");
    }
}

export function getHoverProvider(): vscode.HoverProvider {
    return new CMakeHoverProvider();
}
