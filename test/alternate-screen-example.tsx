import {spawn as spawnProcess} from 'node:child_process';
import * as path from 'node:path';
import url from 'node:url';
import test, {type TestContext} from 'node:test';
import {gameReducer} from '../examples/alternate-screen/alternate-screen.js';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

test('snake can move into the tail cell when the tail moves away', (t: TestContext) => {
	const state = {
		snake: [
			{x: 2, y: 1},
			{x: 1, y: 1},
			{x: 1, y: 2},
			{x: 2, y: 2},
		],
		food: {x: 0, y: 0},
		score: 3,
		gameOver: false,
		won: false,
		frame: 10,
	};

	const nextState = gameReducer(state, {
		type: 'tick',
		direction: 'down',
	});

	t.assert.strictEqual(nextState.gameOver, false);
	t.assert.deepStrictEqual(nextState.snake, [
		{x: 2, y: 2},
		{x: 2, y: 1},
		{x: 1, y: 1},
		{x: 1, y: 2},
	]);
	t.assert.strictEqual(nextState.score, state.score);
});

test('snake ends with a win when it fills the board', async (t: TestContext) => {
	const fixturePath = path.join(
		__dirname,
		'fixtures/alternate-screen-full-board-win.tsx',
	);
	const childProcess = spawnProcess('node', ['--import=tsx', fixturePath], {
		cwd: __dirname,
		stdio: ['ignore', 'pipe', 'pipe'],
	});

	let stdout = '';

	let stderr = '';

	childProcess.stdout.on('data', (data: Uint8Array | string) => {
		stdout += typeof data === 'string' ? data : data.toString();
	});

	childProcess.stderr.on('data', (data: Uint8Array | string) => {
		stderr += typeof data === 'string' ? data : data.toString();
	});

	const result = await new Promise<
		{timedOut: true} | {timedOut: false; exitCode: number}
	>((resolve, reject) => {
		const timeout = setTimeout(() => {
			childProcess.kill();
			resolve({timedOut: true});
		}, 1000);

		childProcess.on('error', error => {
			clearTimeout(timeout);
			reject(error);
		});

		childProcess.on('close', exitCode => {
			clearTimeout(timeout);
			resolve({timedOut: false, exitCode: exitCode ?? 0});
		});
	});

	if (result.timedOut) {
		t.assert.fail('Fixture hung instead of finishing the full-board win case');
		return;
	}

	t.assert.strictEqual(
		result.exitCode,
		0,
		`Fixture exited with stderr: ${stderr}`,
	);

	const nextState = JSON.parse(stdout) as {
		gameOver: boolean;
		won: boolean;
		score: number;
		snakeLength: number;
	};

	t.assert.ok(nextState.gameOver);
	t.assert.ok(nextState.won);
	t.assert.strictEqual(nextState.score, 297);
	t.assert.strictEqual(nextState.snakeLength, 300);
});
