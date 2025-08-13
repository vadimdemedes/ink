import test from 'ava';
import measureText from '../src/measure-text.js';

test('measure "constructor"', t => {
	const {width} = measureText('constructor');
	t.is(width, 11);
});
