const isDevToolsReachable = async (
	url = 'ws://localhost:8097',
	timeoutMs = 2000,
): Promise<boolean> =>
	new Promise(resolve => {
		const socket = new WebSocket(url);

		const timeout = setTimeout(() => {
			resolve(false);
			socket.close();
		}, timeoutMs);
		// Don't let the timeout keep the process alive on its own
		timeout.unref();

		socket.addEventListener('open', () => {
			clearTimeout(timeout);
			socket.close();
			resolve(true);
		});

		// The socket is already closing after `error`
		socket.addEventListener('error', () => {
			clearTimeout(timeout);
			resolve(false);
		});
	});

export default isDevToolsReachable;
