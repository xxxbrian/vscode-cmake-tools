import * as proc from '../proc';
import * as util from '../util';
import * as telemetry from '../telemetry';
import { win32 } from 'path';

export interface ICMakeInstaller {
    platform: string;
    isSupported: boolean;
    BeginInstall(): void;
    CancelInstall(): boolean;
}

class Win32Installer implements ICMakeInstaller {
    platform = "win32";
    isSupported = true;

    BeginInstall() {

    }

    CancelInstall(): boolean {
        return false;
    }
}

class OSXInstaller implements ICMakeInstaller {
    platform = "osx";
    isSupported = true;

    BeginInstall() {

    }

    CancelInstall(): boolean {
        return false;
    }
}

class LinuxInstaller implements ICMakeInstaller {
    platform = "linux";
    isSupported = true;

    BeginInstall() {

    }

    CancelInstall(): boolean {
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
    installer.BeginInstall();
}
