import process from 'node:process';
import React, {useEffect} from 'react';
import {Text, render} from '../../src/index.js';

function Late() {
	useEffect(() => {
		const timer = setTimeout(() => {
			process.stdout.write('late work done\n');
		}, 0);

		return () => {
			clearTimeout(timer);
		};
	}, []);

	return <Text>Late</Text>;
}

// This listener runs before the one Ink adds below, so the second instance starts waiting while `beforeExit` is being emitted and has to be left alone until its timer has fired and `beforeExit` is emitted again.
let lateExit: Promise<unknown> | undefined;
process.once('beforeExit', () => {
	lateExit = render(<Late />, {stdout: process.stderr}).waitUntilExit();
});

await render(<Text>Hello World</Text>).waitUntilExit();
await lateExit;
process.stdout.write('exited\n');
