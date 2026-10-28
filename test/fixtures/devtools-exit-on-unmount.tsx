import React from 'react';
import {render, Text} from '../../src/index.js';

const app = render(<Text>Hello World</Text>);

setTimeout(() => {
	app.unmount();
}, 500);

await app.waitUntilExit();
console.log('exited');
