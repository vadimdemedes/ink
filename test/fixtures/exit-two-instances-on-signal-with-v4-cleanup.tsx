import fs from 'node:fs';
import process from 'node:process';
import React, {useEffect} from 'react';
import {onExit} from 'signal-exit';
import {Text, render} from '../../src/index.js';

function App({name}: {readonly name: string}) {
	useEffect(
		() => () => {
			fs.writeSync(process.stdout.fd, `unmounted ${name}\n`);
		},
		[name],
	);

	return <Text>Hello {name}</Text>;
}

onExit(() => {
	fs.writeSync(process.stdout.fd, 'signal-exit-v4-ran\n');
});

render(<App name="first" />);
render(<App name="second" />);

process.stdout.write('__READY__\n');

const timer = setInterval(() => {}, 1000);
timer.unref();
// Keep process alive until signal arrives.
setTimeout(() => {}, 10_000);
