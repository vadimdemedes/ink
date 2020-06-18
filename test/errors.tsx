/* eslint-disable unicorn/string-content */
import React from 'react';
import test from 'ava';
import {spy} from 'sinon';
import patchConsole from 'patch-console';
import stripAnsi from 'strip-ansi';
import {render} from '../src';

let restore;

test.before(() => {
	restore = patchConsole();
});

test.after(() => {
	restore();
});

test('catch and display error', t => {
	const stdout = {
		columns: 100,
		write: spy()
	};

	const Test = () => {
		throw new Error('Oh no');
	};

	render(<Test />, {stdout});

	t.deepEqual(
		stripAnsi(stdout.write.lastCall.args[0]).split('\n').slice(0, 14),
		[
			'',
			'  ERROR  Oh no',
			'',
			' test/errors.tsx:26:9',
			'',
			' 23:   };',
			' 24:',
			' 25:   const Test = () => {',
			" 26:     throw new Error('Oh no');",
			' 27:   };',
			' 28:',
			' 29:   render(<Test />, {stdout});',
			'',
			' - Test (test/errors.tsx:26:9)'
		]
	);
});
