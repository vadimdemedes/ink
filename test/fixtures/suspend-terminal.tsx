import process from 'node:process';
import React, {useEffect} from 'react';
import {render, Text, useApp, useInput} from '../../src/index.js';

function Test() {
	const {suspendTerminal, exit} = useApp();
	// Enable raw mode + the input pipeline so suspendTerminal has real terminal
	// ownership to release.
	useInput(() => {});

	useEffect(() => {
		void (async () => {
			await suspendTerminal(async () => {
				// Simulate a child process drawing directly to the terminal while Ink
				// has handed it over.
				process.stdout.write('CHILD_OUTPUT');
			});

			// The resume redraw was already awaited inside suspendTerminal; this delay
			// just keeps the process alive briefly so the PTY captures it before exit.
			setTimeout(exit, 100);
		})();
	}, [suspendTerminal, exit]);

	return <Text>Ink frame</Text>;
}

const app = render(<Test />);

await app.waitUntilExit();
