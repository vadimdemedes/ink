import test, {before, after, type TestContext} from 'node:test';
import colorize from '../src/colorize.js';
import {enableTestColors, disableTestColors} from './helpers/force-colors.js';

before(enableTestColors);
after(disableTestColors);

for (const type of ['foreground', 'background'] as const) {
	test(`RGB ${type} colors allow whitespace around components`, (t: TestContext) => {
		const prefix = type === 'foreground' ? 38 : 48;
		const reset = type === 'foreground' ? 39 : 49;
		const expected = `\u{1B}[${prefix};2;232;131;136mTest\u{1B}[${reset}m`;

		for (const color of [
			'rgb(232 , 131 , 136)',
			'rgb(  232,  131,  136  )',
			'rgb(\t232\t,\n131\n,\t136\t)',
		]) {
			t.assert.strictEqual(colorize('Test', color, type), expected);
		}
	});
}

for (const color of [
	'level',
	'constructor',
	'bold',
	'bgRed',
	'unknown',
	'rgb(23 2, 131, 136)',
	'rgb(232, , 136)',
]) {
	for (const type of ['foreground', 'background'] as const) {
		test(`ignores invalid ${type} color ${color}`, (t: TestContext) => {
			t.assert.strictEqual(colorize('Test', color, type), 'Test');
		});
	}
}
