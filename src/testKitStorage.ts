import { Kit, KitScanOptions } from '@cmt/kit';
import * as util from '@cmt/util';
import { fs } from '@cmt/pr';
import paths from './paths';
import * as path from 'path';
import * as logging from './logging';

const log = logging.createLogger('testKitStorage');

interface KitsStorageFormat {
    [key: string]: Kit[];
}

/**
 * Speed up tests by not requiring an actual scan for Kits every time.
 */
export class TestKitStorage {
    private readonly kitsStoragePath: string = path.join(paths.tmpDir, 'testkits.json');
    private key: string;
    private storage: KitsStorageFormat = {};

    constructor(opt?: KitScanOptions) {
        if (opt) {
            this.key = `${opt.ignorePath}-${opt.scanDirs?.join()}-${opt.minGWSearchDirs?.join()}`;
        } else {
            this.key = 'no-opts';
        }
    }

    /**
     * If the extension is in test mode, the kits will be saved to context storage
     */
    public async saveKits(kits?: Kit[]): Promise<void> {
        if (util.isTestMode()) {
            if (!kits) {
                delete this.storage[this.key];
            } else {
                this.storage[this.key] = kits;
            }
            await this.saveKitsFile();
        }
    }

    private async saveKitsFile() {
        try {
            log.debug('saving kits');
            const file = JSON.stringify(this.storage);
            await fs.writeFile(this.kitsStoragePath, file, "utf8");
            log.debug('success');
        } catch (e) {
        }
    }

    private async readKitsFile() {
        try {
            log.debug('reading kits');
            const file = await fs.readFile(this.kitsStoragePath, "utf8");
            this.storage = JSON.parse(file);
            log.debug('success');
        } catch (e) {
        }
    }

    public async getKits(): Promise<Kit[] | undefined> {
        if (!util.isTestMode()) {
            return undefined;
        }
        try {
            const stats = await fs.stat(this.kitsStoragePath);
            const ageInMinutes = (new Date().getTime() - stats.mtimeMs) / 60000;
            if (ageInMinutes > 30) {
                log.debug(`Last write was ${ageInMinutes} minutes ago. Deleting saved kits so that a new scan will happen`);
                this.storage = {};
            } else if (!this.storage[this.key]) {
                await this.readKitsFile();
            }
            return this.storage[this.key];
        } catch (e) {
            return undefined;
        }
    }
}
