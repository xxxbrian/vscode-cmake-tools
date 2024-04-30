import * as proc from '../proc';
import * as util from '../util';
import * as telemetry from '../telemetry';
import { win32 } from 'path';
import * as vscode from 'vscode';
import * as nls from 'vscode-nls';
import * as logging from '@cmt/logging';
import { CMakeInstallerOutputConsumer } from '@cmt/cmake/cmakeInstallerOutputConsumer';
import { Exception } from 'handlebars';
import { ExecutionOptions } from '@cmt/preset';
import * as fs from 'fs';

const fetch = require("node-fetch");

nls.config({ messageFormat: nls.MessageFormat.bundle, bundleFormat: nls.BundleFormat.standalone })();
const localize: nls.LocalizeFunc = nls.loadMessageBundle();

const log = logging.createLogger('cmakeAcquisition');

export interface ICMakeInstaller {
    platform: string;
    isSupported: boolean;
    BeginInstall(): Promise<boolean>;
    IsPkgManagerInstalled(): Promise<boolean>;
    CancelInstall(): Promise<boolean>;
    GetUserConsent(): Promise<boolean>;
}

export abstract class BaseInstaller implements ICMakeInstaller {
    platform = "base";
    isSupported = true;

    async IsPkgManagerInstalled(): Promise<boolean> {
        return true;
    }

    async BeginInstall(): Promise<boolean> {
        return this.IsPkgManagerInstalled();
    }

    CancelInstall(): Promise<boolean> {
        throw new Exception("NotImplemented");
    }

    async IsInstalledAndDiscoverable(shellCommand: string, program: string, output: proc.OutputConsumer, execOpt: ExecutionOptions): Promise<boolean> {
        const cmd = "-c " + program + " -v";
        const shell = proc.execute(shellCommand, [cmd], output, execOpt);

        return (await shell.result).retc === 0;
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
}

class Win32Installer extends BaseInstaller {
    platform = "win32";
    isSupported = true;

    async BeginInstall(): Promise<boolean>  {
        // Happy path for 94% of users: winget.
        const out = vscode.window.createOutputChannel("CMakeInstallation");
        out.appendLine(localize("cmakeInstall.Begin", "Beginning CMake Installation..."));
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
        // TODO Ninja-build.Ninja
        // add to progress reporting

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

    async IsPkgManagerInstalled(): Promise<boolean> {
        const res = await proc.execute('cmd', ['/C winget -v']).result;
        if (res.retc !== 0) {
            // No winget, or update needed . TODO handle this case, instructions to download?
        }

        return res.retc === 0;
    }

    async GetUserConsent(): Promise<boolean> {
        return super.GetUserConsent();
    }

    async CancelInstall(): Promise<boolean> {
        return false;
    }
}

class OSXInstaller extends BaseInstaller {
    platform = "osx";
    isSupported = true;

    async BeginInstall(): Promise<boolean> {
        const out = vscode.window.createOutputChannel("CMakeInstallation");
        out.appendLine(localize("cmakeInstall.Begin", "Beginning CMake Installation..."));
        out.show();
        const output = new CMakeInstallerOutputConsumer(out);
        const execOpt: proc.ExecutionOptions = { showOutputOnError: true };

        // use /bin/sh check if homebrew installed
        if (await super.IsInstalledAndDiscoverable("/bin/sh", "homebrew", output, execOpt)) {
            // install homebrew
            // which might need terminal access like compiler acquisition
        }
        // this.InstallCMake(); // brew install cmake
        // this.InstallNinja(); // brew install ninja
        return true;
    }

    async CancelInstall(): Promise<boolean> {
        return false;
    }
}

class LinuxInstaller extends BaseInstaller {
    platform = "linux";
    isSupported = true;

    async BeginInstall(): Promise<boolean> {
        const out = vscode.window.createOutputChannel("CMakeInstallation");
        out.appendLine(localize("cmakeInstall.Begin", "Beginning CMake Installation..."));
        out.show();

        out.appendLine("HELLO LINUX WE ARE HERE"); // TODO remove. just testing.

        // Create progress reporter?

        const output = new CMakeInstallerOutputConsumer(out);
        const execOpt: proc.ExecutionOptions = { showOutputOnError: true };

        await this.InstallCMake(output, execOpt);
        await this.InstallNinja(output, execOpt);

        // report progress

        return false; // TODO
    }

    GetPlatform(): string {
        return "x64"; // TODO
    }

    GetCMakeDownloadLinkForPlatform(platform: string) {
        if (platform.includes("arm64")) {
            return "https://aka.ms/vslinux-cmake-3.19-aarch64";
        } else if (platform.includes("x64")) {
            return "https://aka.ms/vslinux-cmake-3.19-x86_64";
        }

        throw new Exception("Unsupported platform");
    }

    GetNinjaDownloadLinkForPlatform(platform: string) {
        if (platform.includes("arm64")) {
            return "https://aka.ms/vslinux-ninja-aarch64"; // TODO create this link
        } else if (platform.includes("x64")) {
            return "https://aka.ms/vslinux-ninja-3.19-x86_64"; // TODO create this link
        }

        throw new Exception("Unsupported platform");
    }

    async DownloadFile(url: string, filename: string) {
        const response = await fetch(url);
        const fileStream = fs.createWriteStream(filename);

        // TODO
    }

    async ValidateCMakeBinary(binaryPath: string): Promise<boolean> {
        // URL to CMake-provided security hash to validate binary download
        const cmakeBinarySHA = "https://aka.ms/vslinux-cmake-3.19-SHA-verify";

        // TODO
        return true;
    }

    async InstallCMake(out: proc.OutputConsumer, execOpt: proc.ExecutionOptions): Promise<boolean> {

        if (await this.IsInstalledAndDiscoverable("/bin/sh", "cmake", out, execOpt)) {
            return true;
        }

        const platform = this.GetPlatform();
        const downloadLink = this.GetCMakeDownloadLinkForPlatform(platform);
        const destination = "C:\\Users\\elmorrow\\";

        // Download binary
        await this.DownloadFile(downloadLink, destination);
        if (!await this.ValidateCMakeBinary(destination)) {
            throw new Exception("Binary did not match SHA");
        }

        // Validated, proceed with installation
        // ($"/bin/sh {PathUtils.EscapeFilenameForUnixShell(remoteFile.FullPath)} --skip-license --prefix={remoteDestDirectory.FullPath}"
        // run .sh script for install skip license

        return this.IsInstalledAndDiscoverable("/bin/sh", "cmake", out, execOpt);
    }

    async InstallNinja(out: proc.OutputConsumer, execOpt: proc.ExecutionOptions): Promise<boolean> {
        if (await this.IsInstalledAndDiscoverable("/bin/sh", "ninja", out, execOpt)) {
            return true;
        }

        const platform = this.GetPlatform();
        const downloadLink = this.GetNinjaDownloadLinkForPlatform(platform);
        const destination = "C:\\Users\\elmorrow\\";

        // Download binary
        await this.DownloadFile(downloadLink, destination);

        // TODO check against hash if it exists? upload if not

        return true;
    }

    async ValidateInstallation(): Promise<boolean> {
        return true; // TODO implement
    }

    async CancelInstall(): Promise<boolean> {
        return false;
    }

    async GetUserConsent(): Promise<boolean> {
        return super.GetUserConsent();
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
