/* eslint-disable import-x/order -- The window polyfill must be imported before `react-devtools-core`. */

// eslint-disable-next-line import-x/no-unassigned-import
import './devtools-window-polyfill.js';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import devtools from 'react-devtools-core';
import isDevToolsReachable from './is-devtools-reachable.js';

const isReachable = await isDevToolsReachable();

if (isReachable) {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-call
	(devtools as any).initialize();
} else {
	console.warn(
		'DEV is set to true, but the React DevTools server is not running. Start it with:\n\n$ npx react-devtools\n',
	);
}

let websocket: WebSocket | undefined;
let connectedInstances = 0;

/**
Connect to React DevTools while at least one Ink instance is mounted. Returns a function that releases the connection.

The open socket keeps the process alive, so it's closed once the last instance unmounts. Ink owns the socket instead of using `connectToDevTools()`, which keeps no reference to hand back and reconnects on a timer that also keeps the process alive.
*/
export const connectToDevTools = (): (() => void) => {
	if (!isReachable) {
		return () => {};
	}

	connectedInstances++;

	if (connectedInstances === 1) {
		const socket = new WebSocket('ws://localhost:8097');
		const listeners = new Set<(message: unknown) => void>();
		let agent: {shutdown: () => void} | undefined;

		socket.addEventListener('message', event => {
			let message: unknown;
			try {
				message = JSON.parse(String(event.data));
			} catch {
				return;
			}

			for (const listener of listeners) {
				listener(message);
			}
		});

		socket.addEventListener('open', () => {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-call
			(devtools as any).connectWithCustomMessagingProtocol({
				onSubscribe(listener: (message: unknown) => void) {
					listeners.add(listener);
				},
				onUnsubscribe(listener: (message: unknown) => void) {
					listeners.delete(listener);
				},
				onMessage(event: string, payload: unknown) {
					if (socket.readyState === WebSocket.OPEN) {
						socket.send(JSON.stringify({event, payload}));
					}
				},
			});
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			agent = (globalThis as any).__REACT_DEVTOOLS_GLOBAL_HOOK__
				?.reactDevtoolsAgent;
		});

		// Same teardown as `connectToDevTools()` on close: shutting down the agent unsubscribes from the hook and cleans up the renderer interfaces.
		socket.addEventListener('close', () => {
			agent?.shutdown();
			agent = undefined;
		});

		websocket = socket;
	}

	return () => {
		connectedInstances--;

		if (connectedInstances > 0) {
			return;
		}

		websocket?.close();
		websocket = undefined;
	};
};
