import process from 'node:process';
import {createRequire} from 'node:module';
import test from 'ava';
import {homeAndEraseDown} from '../src/ink.js';
import {reconstructTerminalLines} from './helpers/reconstruct-terminal.js';

const require = createRequire(import.meta.url);

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
const {spawn} = require('node-pty') as typeof import('node-pty');

test.serial(
	'#973: static item taller than viewport keeps its last line',
	async t => {
		const rows = 6;
		const child = spawn(
			'node',
			['--import=tsx', 'issue-973-static-commit.tsx', String(rows)],
			{
				name: 'xterm-color',
				cols: 100,
				rows,
				cwd: 'test/fixtures',
				env: {
					...process.env,
					// eslint-disable-next-line @typescript-eslint/naming-convention
					NODE_NO_WARNINGS: '1',
					// eslint-disable-next-line @typescript-eslint/naming-convention
					CI: 'false',
				},
			},
		);

		let output = '';
		child.onData(data => {
			output += data;
		});

		const exitCode = await new Promise<number>(resolve => {
			child.onExit(({exitCode}) => {
				resolve(exitCode ?? 1);
			});
		});

		t.is(exitCode, 0);

		const visibleLines = reconstructTerminalLines(output, rows).filter(
			line => line.length > 0,
		);

		t.true(
			visibleLines.includes('line 6'),
			`Last static line must stay visible, got ${JSON.stringify(visibleLines)}`,
		);
		t.true(
			visibleLines.includes('INPUT BOX'),
			`Live region must render, got ${JSON.stringify(visibleLines)}`,
		);
		t.false(output.includes(homeAndEraseDown));
	},
);
