import fs from 'node:fs';
import process from 'node:process';
import React, {useEffect} from 'react';
import {execa} from 'execa';
import {Text, render} from '../../src/index.js';

function App() {
	useEffect(
		() => () => {
			fs.writeSync(process.stdout.fd, 'unmounted');
		},
		[],
	);

	return <Text>Hello World</Text>;
}

render(<App />);

// `execa` 9 depends on `signal-exit` 4, which replaces `process.emit` when it registers (and later removes) its own exit handler while the child runs
await execa(process.execPath, ['-e', '']);

// eslint-disable-next-line unicorn/no-process-exit
process.exit(0);
