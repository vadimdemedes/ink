import test, {type TestContext} from 'node:test';
import Output from '../src/output.js';

for (const y of [-2, 2]) {
	test(`does not tokenize writes outside the output at y=${y}`, (t: TestContext) => {
		const segment = t.mock.method(Intl.Segmenter.prototype, 'segment');
		const text = `offscreen-${y}\nsecond line`;
		const output = new Output({width: 10, height: 2});
		output.write(0, y, text, {transformers: []});
		t.assert.deepStrictEqual(output.get(), {output: '\n', height: 2});
		t.assert.strictEqual(
			segment.mock.calls.some(call => call.arguments[0] === text),
			false,
		);
	});
}

for (const clip of [
	{x1: undefined, x2: undefined, y1: 2, y2: 3},
	{x1: undefined, x2: undefined, y1: -2, y2: -1},
	{x1: 2, x2: 2, y1: undefined, y2: undefined},
]) {
	test(`does not tokenize writes outside clip ${JSON.stringify(clip)}`, (t: TestContext) => {
		const segment = t.mock.method(Intl.Segmenter.prototype, 'segment');
		const text = `clipped-${JSON.stringify(clip)}`;
		const output = new Output({width: 10, height: 4});
		output.clip(clip);
		output.write(0, 0, text, {transformers: []});
		output.unclip();
		output.get();
		t.assert.strictEqual(
			segment.mock.calls.some(call => call.arguments[0] === text),
			false,
		);
	});
}

test('reuses tokenization across frames while applying each frame’s transform', (t: TestContext) => {
	const text = '\u{1B}[31mcache across frames\u{1B}[39m';
	const first = new Output({width: 30, height: 1});
	first.write(0, 0, text, {transformers: []});
	first.get();

	const segment = t.mock.method(Intl.Segmenter.prototype, 'segment');
	const second = new Output({width: 30, height: 1});
	second.write(0, 0, text, {
		transformers: [line => line.replace('across', 'ACROSS')],
	});
	t.assert.strictEqual(
		second.get().output,
		'\u{1B}[31mcache ACROSS frames\u{1B}[39m',
	);
	t.assert.strictEqual(
		segment.mock.calls.some(call => call.arguments[0] === text),
		false,
	);
});

test('cached multiline styles survive changing viewport clips', (t: TestContext) => {
	const text = '\u{1B}[31mA\nB\nC\u{1B}[39m';
	for (const [y, expected] of [
		[-1, 'B'],
		[-2, 'C'],
		[0, 'A'],
	] as const) {
		const output = new Output({width: 1, height: 1});
		output.clip({x1: 0, x2: 1, y1: 0, y2: 1});
		output.write(0, y, text, {transformers: []});
		output.unclip();
		t.assert.strictEqual(
			output.get().output,
			`\u{1B}[31m${expected}\u{1B}[39m`,
		);
	}
});

test('counts trailing empty rows when rejecting offscreen text', (t: TestContext) => {
	const output = new Output({width: 1, height: 1});
	const transform = t.mock.fn(
		(line: string, index: number) => `${index}${line}`,
	);
	output.write(0, -1, 'x\n', {transformers: [transform]});
	t.assert.strictEqual(output.get().output, '1');
	t.assert.deepStrictEqual(transform.mock.calls[0]!.arguments, ['', 1]);
});

const dashboard = (status: string) =>
	`\u{1B}[32mrow 0\nrow 1\n\u{1B}[33m${status}\u{1B}[32m\nrow 3\u{1B}[39m`;

const dashboardFrame = (status: string) => {
	const output = new Output({width: 10, height: 4});
	output.write(0, 0, dashboard(status), {transformers: []});
	return output.get().output;
};

test('changing one row of a multiline block keeps styles spanning newlines', (t: TestContext) => {
	const expected = (status: string) =>
		[
			'\u{1B}[32mrow 0\u{1B}[39m',
			'\u{1B}[32mrow 1\u{1B}[39m',
			`\u{1B}[33m${status}\u{1B}[39m`,
			'\u{1B}[32mrow 3\u{1B}[39m',
		].join('\n');

	t.assert.strictEqual(dashboardFrame('ready'), expected('ready'));
	t.assert.strictEqual(dashboardFrame('busy'), expected('busy'));
	t.assert.strictEqual(dashboardFrame('ready'), expected('ready'));
});

test('changing one row of a multiline block reuses the unchanged block', (t: TestContext) => {
	dashboardFrame('reused');
	dashboardFrame('changed');

	const segment = t.mock.method(Intl.Segmenter.prototype, 'segment');
	dashboardFrame('reused');
	t.assert.strictEqual(
		segment.mock.calls.some(call => call.arguments[0] === dashboard('reused')),
		false,
	);
});

test('changing one row of a multiline block does not retain parsed characters for the block', (t: TestContext) => {
	const isStyledChars = (value: unknown) =>
		Array.isArray(value) &&
		value.some(
			item => typeof item === 'object' && item !== null && 'styles' in item,
		);

	// Each changed row makes the block a new key, so retaining its parsed
	// characters would keep a copy of the whole block per update.
	const set = t.mock.method(Map.prototype, 'set');
	for (let update = 0; update < 3; update++) {
		dashboardFrame(`status ${update}`);
	}

	t.assert.strictEqual(
		set.mock.calls.some(call => {
			const [key, value] = call.arguments as [unknown, unknown];
			if (typeof key !== 'string' || !key.includes('\n')) {
				return false;
			}

			const stored: unknown =
				typeof value === 'object' && value !== null && 'value' in value
					? value.value
					: value;
			return isStyledChars(stored);
		}),
		false,
	);
});

// Zero-width characters at the clip edges are dropped. The cell writer gives each one a column, so keeping them would push text that fills the clip exactly past its edge.
for (const text of ['\u{301}abc', 'abc\u{7}', '\u{7}abc\u{7}']) {
	test(`text that fills the clip exactly stays inside it: ${JSON.stringify(text)}`, (t: TestContext) => {
		const output = new Output({width: 5, height: 1});
		output.write(3, 0, '|', {transformers: []});
		output.clip({x1: 0, x2: 3, y1: undefined, y2: undefined});
		output.write(0, 0, text, {transformers: []});
		output.unclip();

		t.assert.deepStrictEqual(output.get(), {output: 'abc|', height: 1});
	});
}

test('drops zero-width characters with the columns a clip cuts from either end', (t: TestContext) => {
	const output = new Output({width: 10, height: 1});
	output.clip({x1: 3, x2: 5, y1: undefined, y2: undefined});
	output.write(2, 0, '\u{7}abc\u{7}', {transformers: []});
	output.unclip();

	t.assert.deepStrictEqual(output.get(), {output: '   bc', height: 1});
});
