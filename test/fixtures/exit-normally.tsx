import React from 'react';
import {Text, render} from '../../src/index.js';
import {writeReadySignal} from '../helpers/ready.js';

const {waitUntilExit} = render(<Text>Hello World</Text>);

// Signal to test harness that Ink is ready to accept input
writeReadySignal();

await waitUntilExit();
console.log('exited');
