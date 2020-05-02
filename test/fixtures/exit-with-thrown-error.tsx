import React from 'react';
import {render} from '../../src';

const Test = () => {
	throw new Error('errored');
};

const app = render(<Test />);
app.waitUntilExit().catch(error => console.log(error.message));
