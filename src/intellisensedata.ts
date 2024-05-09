import * as path from 'path';
import { promisify } from 'util';
import { CancellationToken, MarkdownString, MarkedString } from 'vscode';
const fs = require('fs');
import * as util from '@cmt/util';
import { getExtensionLocalizedStrings } from './extension';

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

    private static instance: IntellisenseData; // TODO: currently making this a singleton class to minimize operations, might not be the right approach TBD

    public static async getInstance(): Promise<IntellisenseData> {
        if (!IntellisenseData.instance) {
            IntellisenseData.instance = new IntellisenseData();
            await IntellisenseData.instance.init();
        }
        return IntellisenseData.instance;
    }

    async init() {
        this.commands = await parseJsonFile(path.join(util.thisExtensionPath(), "dist", "src", "docs", "commands.json"));
        this.variables = await parseJsonFile(path.join(util.thisExtensionPath(), "dist", "src", "docs", "variables.json"));
    }

    public getToolTipForText(word: string, _token: CancellationToken): (MarkdownString | string | MarkedString)[]  {
        // retrieve elements of quickinfo name, description, samples from commands and variables
        // display in quickinfo window
        // see src/vc/projbld/CMake/Package/IntelliSense/IntellisenseData.cs in VS repo for impl

        const searchToken = this.commands[word] ?? this.variables[word];

        if (!searchToken) {
            return [""];
        }

        const name = searchToken["name"];
        let description = searchToken["description"] as string;
        const syntaxExamples = searchToken["syntax_examples"] as string[];
        const targets = searchToken["targets"];

        if (!name || !description) {
            return [""];
        }

        const resultStrings = [];

        if (description.startsWith("loc_")) {
            const localizedStrings = getExtensionLocalizedStrings();
            if (localizedStrings) {
                description = localizedStrings[description];
            }
        }

        resultStrings.push(description);

        if (syntaxExamples) {
            for (const example of syntaxExamples) {
                const splitExamples = example.split(`${name}(`);
                for (const ex of splitExamples) {
                    if (ex) {
                        const hover = { language: "cmake", value: ` ${name}(${ex}` };
                        resultStrings.push(hover);
                    }
                }
            }
        }

        return resultStrings;
    }
}
