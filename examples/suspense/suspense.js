'use strict';
const React = require('react');
const {render, Text} = require('../..');

let promise;
let state;
let value;

const read = () => {
	if (!promise) {
		promise = new Promise(resolve => {
			setTimeout(resolve, 500);
		});

		state = 'pending';

		// eslint-disable-next-line promise/prefer-await-to-then
		promise.then(() => {
			state = 'done';
			value = 'Hello World';
		});
	}

	if (state === 'pending') {
		throw promise;
	}

	if (state === 'done') {
		return value;
	}
};

const Example = () => {
	const message = read();
	return <Text>{message}</Text>;
};

const Fallback = () => <Text>Loading...</Text>;

render(
	<React.Suspense fallback={<Fallback />}>
		<Example />
	</React.Suspense>
);
