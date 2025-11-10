import test from 'ava';
import ansiEscapes from 'ansi-escapes';
import {run} from './helpers/run.js';

test('does not enter alternate buffer when already active', async t => {
	const output = await run('alternate-buffer-already-active');

	t.false(
		output.includes(ansiEscapes.enterAlternativeScreen),
		'Should NOT enter alternate screen',
	);
	t.true(
		output.includes(ansiEscapes.exitAlternativeScreen),
		'Should exit alternate screen',
	);
	t.true(output.includes('Hello World'), 'Should render content');
});
