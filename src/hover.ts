// Populate hover  provider.

import * as vscode from "vscode";
import * as id from "@cmt/intellisenseData";

class CMakeHoverProvider implements vscode.HoverProvider {
    provideHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.ProviderResult<vscode.Hover> {
        // get tooltip for span
        return id.IntellisenseData.getInstance().then(data => {
            // Get the word at the current position
            const wordRange = document.getWordRangeAtPosition(position);
            const word = document.getText(wordRange);

            // Get tooltip for span
            const tooltip = data.getToolTipForText(word, token);

            return new vscode.Hover(tooltip);
        });
    }
}

export function getHoverProvider(): vscode.HoverProvider {
    return new CMakeHoverProvider();
}
