import process from 'node:process';
import React from 'react';
import {render, Text} from '../../src/index.js';

const app = render(<Text>Hello</Text>, {debug: true});

app.unmount();
await app.waitUntilExit();
process.stdout.write('DONE');
