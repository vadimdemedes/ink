import process from 'node:process';
import React from 'react';
import {Text, render} from '../../src/index.js';

const first = render(<Text>Hello World</Text>);
const second = render(<Text>Hello World</Text>, {stdout: process.stderr});

let beforeExitCount = 0;
process.on('beforeExit', () => {
	beforeExitCount++;
});

// Neither instance is unmounted, so the promises settle only when `beforeExit` unmounts both instances.
await Promise.all([first.waitUntilExit(), second.waitUntilExit()]);
process.stdout.write(`exited after ${beforeExitCount} beforeExit\n`);
