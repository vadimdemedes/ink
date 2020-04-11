import React from 'react';
import {render} from '../../src';

const Test = () => {
	throw new Error('errored');
};

const app = render(<Test/>, {
	experimental: process.env.EXPERIMENTAL === 'true'
});

app.waitUntilExit().catch(error => console.log(error.message));
