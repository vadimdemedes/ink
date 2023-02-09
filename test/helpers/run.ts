import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const {spawn} = require('node-pty');
import * as path from 'path'
import * as url from 'url';
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
		const executable = path.join(__dirname, "../../node_modules/bin/ts-node-esm")
		const args = [path.join(__dirname, `/../fixtures/${fixture}.tsx`)]
		const term = spawn(executable, args, {
			name: 'xterm-color',
			cols: typeof props?.columns === 'number' ? props.columns : 100,
			cwd: __dirname,
			env
		});

		console.log("term");
		let output = '';

		term.on('data', (data: any) => {
			output += data;
		});

		term.on('exit', (code: any) => {
			if (code === 0) {
				resolve(output);
				return;
			}

			reject(new Error(`Process exited with a non-zero code: ${output}`));
		});
	});
};
