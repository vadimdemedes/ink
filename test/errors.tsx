/* eslint-disable unicorn/string-content */
import React from 'react';
import test from 'ava';
import patchConsole from 'patch-console';
import stripAnsi from 'strip-ansi';
import {render} from '../src/index.js';
import createStdout from './helpers/create-stdout.js';

let restore: any;

test.before(() => {
	restore = patchConsole(() => {});
});

test.after(() => {
	restore();
});

test('catch and display error', t => {
	const stdout = createStdout();

	const Test = () => {
		throw new Error('Oh no');
	};

	render(<Test />, {stdout: stdout as any});

	t.deepEqual(
		stripAnsi((stdout.write as any).lastCall.args[0]).split('\n').slice(0, 14),
		[
			'',
			'  ERROR  Oh no',
			'',
			' test/errors.tsx:23:9',
			'',
			' 20:   const stdout = createStdout();',
			' 21:',
			' 22:   const Test = () => {',
			" 23:     throw new Error('Oh no');",
			' 24:   };',
			' 25:',
			' 26:   render(<Test />, {stdout});',
			'',
			' - Test (test/errors.tsx:23:9)'
		]
	);
});
