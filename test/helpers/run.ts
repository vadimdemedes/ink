import process from 'node:process';
import {createRequire} from 'node:module';
import path from 'node:path';
import url from 'node:url';

const require = createRequire(import.meta.url);

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
const {spawn} = require('node-pty') as typeof import('node-pty');

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

type Run = (
	fixture: string,
	props?: {env?: Record<string, string>; columns?: number}
) => Promise<string>;

export const run: Run = async (fixture, props) => {
	const env: Record<string, string> = {
		...(process.env as Record<string, string>),
		...props?.env
	};

	return new Promise<string>((resolve, reject) => {
		const executable = path.join(
			__dirname,
			'../../node_modules/.bin/ts-node-esm'
		);

		const args = [path.join(__dirname, `/../fixtures/${fixture}.tsx`)];
		const term = spawn(executable, args, {
			name: 'xterm-color',
			cols: typeof props?.columns === 'number' ? props.columns : 100,
			cwd: __dirname,
			env
		});

		let output = '';

		term.on('data', (data: string) => {
			output += data;
		});

		term.on('exit', (code: number) => {
			if (code === 0) {
				resolve(output);
				return;
			}

			reject(new Error(`Process exited with a non-zero code: ${output}`));
		});
	});
};
