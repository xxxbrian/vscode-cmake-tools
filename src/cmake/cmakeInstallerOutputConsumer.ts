import { Logger } from '@cmt/logging';
import { OutputConsumer } from '@cmt/proc';
import * as util from '@cmt/util';
import * as vscode from 'vscode';

export class CMakeInstallerOutputConsumer implements OutputConsumer {
    constructor(readonly outputChannel: vscode.OutputChannel, readonly logger?: Logger) {
    }
    output(line: string): void {
        const pattern = new RegExp("^[a-zA-Z]+"); // May need to revisit.
        const lines = line.split('\r');
        lines.forEach(s => {
            const orig = s;
            s = s.trim();
            const f = s.match(pattern)?.[0];
            if (f !== undefined) {
                this.outputChannel.appendLine(s);
            }
        });
    }
    error(error: string): void {
        this.logger?.error(error);
        this.outputChannel.appendLine(error);
    }
}
