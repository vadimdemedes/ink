import {createServer, type Server} from 'node:net';
import {once} from 'node:events';
import test, {type TestContext} from 'node:test';
import {WebSocketServer} from 'ws';
import isDevToolsReachable from '../src/is-devtools-reachable.js';

const listen = async (server: Server): Promise<number> => {
	server.listen(0, '127.0.0.1');
	await once(server, 'listening');
	const address = server.address();
	if (address === null || typeof address === 'string') {
		throw new Error('Expected a TCP address');
	}

	return address.port;
};

test('resolves true when a WebSocket server accepts the connection', async (t: TestContext) => {
	const server = new WebSocketServer({host: '127.0.0.1', port: 0});
	await once(server, 'listening');
	const {port} = server.address() as {port: number};

	t.assert.ok(await isDevToolsReachable(`ws://127.0.0.1:${port}`));

	server.close();
});

test('resolves false when the connection is refused', async (t: TestContext) => {
	const server = createServer(socket => {
		socket.destroy();
	});
	const port = await listen(server);

	t.assert.strictEqual(
		await isDevToolsReachable(`ws://127.0.0.1:${port}`),
		false,
	);

	server.close();
});

test('resolves false when the server never completes the handshake', async (t: TestContext) => {
	const server = createServer(socket => {
		socket.on('error', () => {});
	});
	const port = await listen(server);

	t.assert.strictEqual(
		await isDevToolsReachable(`ws://127.0.0.1:${port}`, 200),
		false,
	);

	server.close();
});
