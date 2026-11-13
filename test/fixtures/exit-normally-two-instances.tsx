import process from 'node:process';
import React from 'react';
import {Text, render} from '../../src/index.js';

const first = render(<Text>Hello World</Text>);
const second = render(<Text>Hello World</Text>, {stdout: process.stderr});

// Neither instance is unmounted, so the promises settle only when `beforeExit` unmounts both instances.
await Promise.all([first.waitUntilExit(), second.waitUntilExit()]);
process.stdout.write('exited\n');
