import { promisify } from 'util';
const fs = require('fs');

// Create a version of fs.readFile that returns a promise
const readFile = promisify(fs.readFile);

async function parseJsonFile(filename: string): Promise<any[]> {
    try {
        const data = await readFile(filename, 'utf-8');
        return JSON.parse(data);
    } catch (err) {
        console.error(`Error reading documentation: ${err}`);
    }
    return [];
}

export class IntellisenseData {
    public commands: any;
    public variables: any;

    private static instance: IntellisenseData; // TODO: currently making this a singleton class to minimize operations

    private constructor() {
        void this.init(); // TODO double check this approach to async initialization
    }

    public static getInstance(): IntellisenseData {
        if (!IntellisenseData.instance) {
            IntellisenseData.instance = new IntellisenseData();
        }
        return IntellisenseData.instance;
    }

    async init() {
        this.commands = await parseJsonFile("./docs/commands.json");
        this.commands = await parseJsonFile("./docs/variables.json");
    }
}
