import React from 'react';
import {render} from '../../src/index.js';
import {writeReadySignal} from '../helpers/ready.js';

const Test = () => {
	throw new Error('errored');
};

const app = render(<Test />);

// Signal to test harness that Ink is ready to accept input
writeReadySignal();

try {
	await app.waitUntilExit();
} catch (error: unknown) {
	console.log((error as any).message);
}
