import process from 'node:process';
import path from 'node:path';
import url from 'node:url';
import {once} from 'node:events';
import {createRequire} from 'node:module';
import test, {type TestContext} from 'node:test';
import {WebSocketServer} from 'ws';

const require = createRequire(import.meta.url);

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
const {spawn} = require('node-pty') as typeof import('node-pty');

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

test('exit on unmount() while connected to React DevTools', async (t: TestContext) => {
	// The DevTools port is not configurable, so the fake DevTools server has to listen on the default one.
	const server = new WebSocketServer({port: 8097});
	t.after(() => {
		for (const client of server.clients) {
			client.terminate();
		}

		server.close();
	});

	try {
		await once(server, 'listening');
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'EADDRINUSE') {
			t.skip('Port 8097 is in use');
			return;
		}

		throw error;
	}

	let receivedMessages = 0;
	server.on('connection', socket => {
		socket.on('message', () => {
			receivedMessages++;
		});
	});

	const term = spawn(
		process.execPath,
		[
			'--import=tsx',
			path.join(__dirname, 'fixtures/devtools-exit-on-unmount.tsx'),
		],
		{
			name: 'xterm-color',
			useConptyDll: true,
			cols: 100,
			cwd: __dirname,
			env: {
				...process.env,
				// eslint-disable-next-line @typescript-eslint/naming-convention
				CI: 'false',
				// eslint-disable-next-line @typescript-eslint/naming-convention
				DEV: 'true',
				// eslint-disable-next-line @typescript-eslint/naming-convention
				NODE_NO_WARNINGS: '1',
			},
		},
	);

	let output = '';
	term.onData(data => {
		output += data;
	});

	const exitCode = await new Promise<number | undefined>(resolve => {
		const timeout = setTimeout(() => {
			term.kill();
			resolve(undefined);
		}, 5000);

		term.onExit(event => {
			clearTimeout(timeout);
			resolve(event.exitCode);
		});
	});

	t.assert.ok(output.includes('exited'));
	t.assert.ok(receivedMessages > 0, 'DevTools never received a message');
	t.assert.strictEqual(exitCode, 0, 'Process did not exit after unmount()');
});
