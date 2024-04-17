import * as proc from '../proc';
import * as util from '../util';
import * as telemetry from '../telemetry';
import { win32 } from 'path';
import * as vscode from 'vscode';
import * as nls from 'vscode-nls';
import * as logging from '@cmt/logging';
import { CMakeInstallerOutputConsumer } from '@cmt/cmake/cmakeInstallerOutputConsumer';
import { Exception } from 'handlebars';

nls.config({ messageFormat: nls.MessageFormat.bundle, bundleFormat: nls.BundleFormat.standalone })();
const localize: nls.LocalizeFunc = nls.loadMessageBundle();

const log = logging.createLogger('cmakeAcquisition');

export interface ICMakeInstaller {
    platform: string;
    isSupported: boolean;
    BeginInstall(): Promise<boolean>;
    CancelInstall(): boolean;
    GetUserConsent(): Promise<boolean>;
}

class Win32Installer implements ICMakeInstaller {
    platform = "win32";
    isSupported = true;

    async BeginInstall(): Promise<boolean>  {
        // Happy path for 94% of users: winget.
        const out = vscode.window.createOutputChannel("CMakeInstallation");
        out.appendLine("Beginning CMake Installation...");
        out.show();
        const res = await proc.execute('cmd', ['/C winget -v']).result;
        if (res.retc !== 0) {
            // No winget, or update needed . TODO handle this case, instructions to download?
        }
        out.appendLine(res.stdout);
        const output = new CMakeInstallerOutputConsumer(out);
        const execOpt: proc.ExecutionOptions = { showOutputOnError: true };
        const winget = proc.execute("cmd", ["/C winget install -e --id Kitware.CMake"], output, execOpt);
        // TODO: this can be cancelled by sending ctrl+c, would need to use child_process with stdin enabled to send.
        // proc.execute currently disables stdin.

        const r = await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            cancellable: false, // TODO relocate to make cancellable? need custom UI?
            title: 'Installing CMake'
        }, async pr => {
            pr.report({  message: "Installing CMake with winget..."});
            return (await winget.result).retc;
        });

        return r === 0;
    }

    async GetUserConsent(): Promise<boolean> {
        interface InstallConsentItem extends vscode.MessageItem {
            action: 'install' | 'cancel';
        }
        const chosen = await vscode.window.showInformationMessage<InstallConsentItem>(
            localize("cmake.consentwindow.title", "We are going to install cmake and ninja."),
            {},
            {
                action: 'install',
                title: localize('cmake.consentwindow.install', 'Install')
            },
            {
                action: 'cancel',
                title: localize('cmake.consentwindow.cancel', 'Cancel')
            }
        );

        if (chosen === undefined) {
            return false;
        }
        return chosen.action === "install";
    }

    CancelInstall(): boolean {
        return false;
    }
}

class OSXInstaller implements ICMakeInstaller {
    platform = "osx";
    isSupported = true;

    BeginInstall(): Promise<boolean> {
        throw new Exception("notimpl");
    }

    CancelInstall(): boolean {
        return false;
    }

    async GetUserConsent(): Promise<boolean> {
        return false;
    }
}

class LinuxInstaller implements ICMakeInstaller {
    platform = "linux";
    isSupported = true;

    BeginInstall(): Promise<boolean> {
        throw new Exception("notimpl");
    }

    CancelInstall(): boolean {
        return false;
    }

    async GetUserConsent(): Promise<boolean> {
        return false;
    }
}

abstract class CMakeInstallerFactory {
    public static Create(): ICMakeInstaller {
        switch (process.platform) {
            case 'win32':
                return new Win32Installer();
            case 'darwin':
                return new OSXInstaller();
            case 'linux':
                return new LinuxInstaller();
            default:
                return new Win32Installer(); // TODO error handling for unsupported OS types.
        }

    }
}

export async function startCMakeAcquisition() {
    const installer = CMakeInstallerFactory.Create();
    if (await installer.GetUserConsent()) {
        await installer.BeginInstall();
    }
}
