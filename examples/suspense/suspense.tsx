import React from 'react';
import {render, Text} from '../../src/index.js';

let promise: Promise<void> | undefined;
let state: string | undefined;
let value: string | undefined;

const read = () => {
	if (!promise) {
		promise = new Promise(resolve => {
			setTimeout(resolve, 2500);
		});

		state = 'pending';

		void promise.then(() => {
			state = 'done';
			value = 'Hello World';
		});
	}

	if (state === 'pending') {
		// eslint-disable-next-line @typescript-eslint/no-throw-literal
		throw promise;
	}

	if (state === 'done') {
		return value;
	}
	return undefined;
};

function Example() {
	const message = read();
	return <Text>{message}</Text>;
}

function Fallback() {
	return <Text>Loading...</Text>;
}

render(
	<React.Suspense fallback={<Fallback />}>
		<Example />
	</React.Suspense>
);
