import {createServer, type Server} from 'node:net';
import {once} from 'node:events';
import test from 'ava';
import {WebSocketServer} from 'ws';
import isDevToolsReachable from '../src/is-devtools-reachable.js';

const listen = async (server: Server): Promise<number> => {
	server.listen(0, '127.0.0.1');
	await once(server, 'listening');
	const address = server.address();
	if (!address || typeof address === 'string') {
		throw new Error('Expected a TCP address');
	}

	return address.port;
};

test('resolves true when a WebSocket server accepts the connection', async t => {
	const server = new WebSocketServer({host: '127.0.0.1', port: 0});
	await once(server, 'listening');
	const {port} = server.address() as {port: number};

	t.true(await isDevToolsReachable(`ws://127.0.0.1:${port}`));

	server.close();
});

test('resolves false when the connection is refused', async t => {
	const server = createServer(socket => {
		socket.destroy();
	});
	const port = await listen(server);

	t.false(await isDevToolsReachable(`ws://127.0.0.1:${port}`));

	server.close();
});

test('resolves false when the server never completes the handshake', async t => {
	const server = createServer(socket => {
		socket.on('error', () => {});
	});
	const port = await listen(server);

	t.false(await isDevToolsReachable(`ws://127.0.0.1:${port}`, 200));

	server.close();
});
