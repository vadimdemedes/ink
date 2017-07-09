import test from 'ava';

const ProgressBar = require('../lib/components/progress-bar.js');

const run = (columns, left, right) => ProgressBar.prototype.getString.call({
	props: {columns, left, right, char: 'x'}
});

test(`has correct length`, t => {
	const str = run(50, 0, 0);
	t.is(str.length, 50);

	const str2 = run(60, 10, 9);
	t.is(str2.length, 41);
});

