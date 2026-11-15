import fs from 'node:fs';
import process from 'node:process';
import {createRequire} from 'node:module';
import React from 'react';
import {Text, render} from '../../src/index.js';

const require = createRequire(import.meta.resolve('execa'));
const {onExit} = require('signal-exit') as {
	onExit: (callback: () => void) => () => void;
};

const instance = render(<Text>Hello World</Text>);

onExit(() => {
	fs.writeSync(process.stdout.fd, 'signal-exit-v4-ran\n');
});

instance.unmount();

// eslint-disable-next-line unicorn/no-process-exit
process.exit(0);
