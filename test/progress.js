import test from 'ava';

const Bar = require('../lib/components/bar.js');

const run = (columns, left, right) => Bar.prototype.renderString.call({
	props: {columns, left, right, char: 'x'}
});

test(`has correct length`, t => {
	const str = run(50, 0, 0);
	t.is(str.length, 50);

	const str2 = run(60, 10, 9);
	t.is(str2.length, 41);
});

