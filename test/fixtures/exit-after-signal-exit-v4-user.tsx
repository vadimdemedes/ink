import process from 'node:process';
import React from 'react';
import {execa} from 'execa';
import {Text, render} from '../../src/index.js';

render(<Text>Hello World</Text>);

// `execa` 9 depends on `signal-exit` 4, which registers (and later removes) its own exit handler while the child runs
await execa(process.execPath, ['-e', '']);

// eslint-disable-next-line unicorn/no-process-exit
process.exit(0);
