// Populate completion items provider.

import * as vscode from "vscode";

class CMakeCompletionsProvider implements vscode.CompletionItemProvider {

    async provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext): Promise<vscode.CompletionItem[]> {
        // sample completion
        const completions: vscode.CompletionItem[] = [];
        const completion = new vscode.CompletionItem("bla", vscode.CompletionItemKind.Field);
        completions.push(completion);
        return completions;

        // See https://devdiv.visualstudio.com/DevDiv/_git/vscode-csharp-next?path=/src/razor/src/Completion/RazorCompletionItemProvider.ts&_a=contents&version=GBfeature/lsp_tools_host
        // sample with LSP
    }

    resolveCompletionItem?(item: vscode.CompletionItem, token: vscode.CancellationToken): vscode.ProviderResult<vscode.CompletionItem> {
        return item;
    }

}

export function getCompletionProvider() {
    return new CMakeCompletionsProvider();
}
