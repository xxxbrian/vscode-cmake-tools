// Populate completion items provider.

import * as vscode from "vscode";

class CMakeCompletionsProvider implements vscode.CompletionItemProvider {

    async provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext): Promise<vscode.CompletionItem[]> {
        // sample completion
        // const completions: vscode.CompletionItem[] = [];
        // const completion = new vscode.CompletionItem("bla", vscode.CompletionItemKind.Field);
        // completions.push(completion);
        // return completions;

        // See https://devdiv.visualstudio.com/DevDiv/_git/vscode-csharp-next?path=/src/razor/src/Completion/RazorCompletionItemProvider.ts&_a=contents&version=GBfeature/lsp_tools_host
        // sample with LSP

        const lineText = document.lineAt(position).text;
        const startingCharacter = lineText[0];
        const textBeforeCaret = lineText.slice(0, position.character);

        // do not provide completions for comments
        if (startingCharacter === '#') {
            return [];
        }

        // Use the presence of a '(' before the caret as a hueristic to
        // identify whether the user is trying to type a command or a
        // variable. Note that this will not correctly handle multi-line
        // command invocations.
        if (textBeforeCaret.includes('(')) {
            // guess variable
        } else {
            // guess command
        }
    }

    resolveCompletionItem?(item: vscode.CompletionItem, token: vscode.CancellationToken): vscode.ProviderResult<vscode.CompletionItem> {
        return item;
    }

}

export function getCompletionProvider() {
    return new CMakeCompletionsProvider();
}
