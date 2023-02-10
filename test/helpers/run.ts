import {createRequire} from 'module';
import path from 'path';
import url from 'url';

const require = createRequire(import.meta.url);
const {spawn} = require('node-pty');

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

type Run = (
	fixture: string,
	props?: {env?: Record<string, string>; columns?: number}
) => Promise<string>;

export const run: Run = (fixture, props) => {
	const env: Record<string, string> = {
		...(process.env as Record<string, string>),
		...(props?.env ?? {})
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
