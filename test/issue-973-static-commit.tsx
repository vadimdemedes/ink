import process from 'node:process';
import {createRequire} from 'node:module';
import test, {type TestContext} from 'node:test';
import {homeAndEraseDown} from '../src/ink.js';
import {reconstructTerminalLines} from './helpers/reconstruct-terminal.js';

const require = createRequire(import.meta.url);

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
const {spawn} = require('node-pty') as typeof import('node-pty');

test('#973: static item taller than viewport keeps its last line', async (t: TestContext) => {
	const rows = 6;
	const child = spawn(
		process.execPath,
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
		child.onExit(({exitCode: code}) => {
			resolve(code ?? 1);
		});
	});

	t.assert.strictEqual(exitCode, 0);

	const visibleLines = reconstructTerminalLines(output, rows).filter(
		line => line.length > 0,
	);

	t.assert.ok(
		visibleLines.includes('line 6'),
		`Last static line must stay visible, got ${JSON.stringify(visibleLines)}`,
	);
	t.assert.ok(
		visibleLines.includes('INPUT BOX'),
		`Live region must render, got ${JSON.stringify(visibleLines)}`,
	);
	t.assert.strictEqual(output.includes(homeAndEraseDown), false);
});
