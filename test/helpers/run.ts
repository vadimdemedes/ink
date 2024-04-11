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
	props?: {env?: Record<string, string>; columns?: number},
) => Promise<string>;

export const run: Run = async (fixture, props) => {
	const env: Record<string, string> = {
		...(process.env as Record<string, string>),
		// eslint-disable-next-line @typescript-eslint/naming-convention
		CI: 'false',
		...props?.env,
		// eslint-disable-next-line @typescript-eslint/naming-convention
		NODE_NO_WARNINGS: '1',
	};

	return new Promise<string>((resolve, reject) => {
		const term = spawn(
			'node',
			[
				'--loader=ts-node/esm',
				path.join(__dirname, `/../fixtures/${fixture}.tsx`),
			],
			{
				name: 'xterm-color',
				cols: typeof props?.columns === 'number' ? props.columns : 100,
				cwd: __dirname,
				env,
			},
		);

		let output = '';

		term.onData(data => {
			output += data;
		});

		term.onExit(({exitCode}) => {
			if (exitCode === 0) {
				resolve(output);
				return;
			}

			reject(new Error(`Process exited with a non-zero code: ${exitCode}`));
		});
	});
};
