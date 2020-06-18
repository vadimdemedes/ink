/* eslint-disable unicorn/string-content */
import React from 'react';
import test from 'ava';
import chalk from 'chalk';
import patchConsole from 'patch-console';
import {renderToString} from './helpers/render-to-string';

let restore;

test.before(() => {
	restore = patchConsole();
});

test.after(() => {
	restore();
});

test('catch and display error', t => {
	const Test = () => {
		throw new Error('Oh no');
	};

	const output = renderToString(<Test />);

	t.deepEqual(output.split('\n').slice(0, 14), [
		'',
		` ${chalk.bgRed.white(' ERROR ')} Oh no`,
		'',
		` ${chalk.dim('test/errors.tsx:19:9')}`,
		'',
		` ${chalk.dim('16:')}`,
		` ${chalk.dim('17:')} test('catch and display error', t => {`,
		` ${chalk.dim('18:')}   const Test = () => {`,
		` ${chalk.dim('19:')}     throw new Error('Oh no');`,
		` ${chalk.dim('20:')}   };`,
		` ${chalk.dim('21:')}`,
		` ${chalk.dim('22:')}   const output = renderToString(<Test />);`,
		'',
		` ${chalk.dim('-')} ${chalk.dim.bold('Test')} ${chalk.dim.gray(
			'(test/errors.tsx:19:9)'
		)}`
	]);
});
