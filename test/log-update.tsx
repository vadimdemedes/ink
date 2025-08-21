import test from 'ava';
import ansiEscapes from 'ansi-escapes';
import logUpdate from '../src/log-update.js';

class MockStream {
	public output: string[] = [];

	write(data: string) {
		this.output.push(data);
	}

	getOutput() {
		return this.output.join('');
	}

	getOutputChunks() {
		return this.output;
	}

	clear() {
		this.output = [];
	}
}

test('incremental rendering - updates only changed lines', t => {
	const stream = new MockStream();
	const log = logUpdate.create(stream as any, {showCursor: true});

	// First render
	log('Line 1\nLine 2\nLine 3');
	stream.clear();

	// Update middle line only
	log('Line 1\nLine 2 UPDATED\nLine 3');

	const chunks = stream.getOutputChunks();
	const output = stream.getOutput();

	// Should move cursor up 2 lines (from end to line 2)
	t.true(output.includes(ansiEscapes.cursorUp(2)));
	// Should erase and update line 2
	t.true(output.includes(ansiEscapes.eraseLine));
	t.true(output.includes('Line 2 UPDATED'));
	// Should NOT include Line 1 or Line 3 (unchanged)
	t.false(chunks.some(chunk => chunk.includes('Line 1')));
	t.false(
		chunks.some(chunk => chunk.includes('Line 3') && !chunk.includes('Line 2')),
	);
});

test('incremental rendering - appends new lines', t => {
	const stream = new MockStream();
	const log = logUpdate.create(stream as any, {showCursor: true});

	// First render
	log('Line 1\nLine 2');
	stream.clear();

	// Add a new line
	log('Line 1\nLine 2\nLine 3');

	const output = stream.getOutput();

	// Should not move cursor up (appending at end)
	t.false(output.includes(ansiEscapes.cursorUp(3)));
	// Should include only the new line
	t.true(output.includes('Line 3'));
	t.false(output.includes('Line 1'));
	t.false(output.includes('Line 2'));
});

test('incremental rendering - removes extra lines', t => {
	const stream = new MockStream();
	const log = logUpdate.create(stream as any, {showCursor: true});

	// First render with 3 lines
	log('Line 1\nLine 2\nLine 3');
	stream.clear();

	// Update to only 2 lines
	log('Line A\nLine B');

	const output = stream.getOutput();

	// Should move cursor up to first line
	t.true(output.includes(ansiEscapes.cursorUp(3)));
	// Should update both lines
	t.true(output.includes('Line A'));
	t.true(output.includes('Line B'));
	// Should clear the third line
	const eraseCount = (
		output.match(new RegExp(ansiEscapes.eraseLine, 'g')) || []
	).length;
	t.is(eraseCount, 3); // All 3 lines get erased before being written
});

test('incremental rendering - handles identical content', t => {
	const stream = new MockStream();
	const log = logUpdate.create(stream as any, {showCursor: true});

	// First render
	log('Line 1\nLine 2');
	stream.clear();

	// Render same content
	log('Line 1\nLine 2');

	const output = stream.getOutput();

	// Should not write anything
	t.is(output, '');
});

test('incremental rendering - updates first line only', t => {
	const stream = new MockStream();
	const log = logUpdate.create(stream as any, {showCursor: true});

	// First render
	log('Line 1\nLine 2\nLine 3');
	stream.clear();

	// Update first line
	log('Line 1 UPDATED\nLine 2\nLine 3');

	const output = stream.getOutput();

	// Should move cursor up to first line
	t.true(output.includes(ansiEscapes.cursorUp(3)));
	// Should update all lines from first changed one
	t.true(output.includes('Line 1 UPDATED'));
	t.true(output.includes('Line 2'));
	t.true(output.includes('Line 3'));
});

test('incremental rendering - updates last line only', t => {
	const stream = new MockStream();
	const log = logUpdate.create(stream as any, {showCursor: true});

	// First render
	log('Line 1\nLine 2\nLine 3');
	stream.clear();

	// Update last line
	log('Line 1\nLine 2\nLine 3 UPDATED');

	const output = stream.getOutput();

	// Should move cursor up only 1 line
	t.true(output.includes(ansiEscapes.cursorUp(1)));
	// Should update only the last line
	t.true(output.includes('Line 3 UPDATED'));
	t.false(output.includes('Line 1'));
	t.false(output.includes('Line 2'));
});

test('clear() method works correctly', t => {
	const stream = new MockStream();
	const log = logUpdate.create(stream as any, {showCursor: true});

	log('Line 1\nLine 2\nLine 3');
	stream.clear();

	log.clear();
	const output = stream.getOutput();

	// Should erase all 3 lines
	t.true(output.includes(ansiEscapes.eraseLines(3)));
});

test('sync() method updates internal state without rendering', t => {
	const stream = new MockStream();
	const log = logUpdate.create(stream as any, {showCursor: true});

	// Sync without rendering
	log.sync('Line 1\nLine 2');
	t.is(stream.getOutput(), '');

	// Next render should use synced state
	log('Line 1\nLine 2\nLine 3');
	const output = stream.getOutput();

	// Should only append Line 3 since Line 1 and 2 were synced
	t.false(output.includes('Line 1'));
	t.false(output.includes('Line 2'));
	t.true(output.includes('Line 3'));
});

test('done() method resets state', t => {
	const stream = new MockStream();
	const log = logUpdate.create(stream as any, {showCursor: false});

	log('Line 1\nLine 2');
	stream.clear();

	log.done();
	stream.clear();

	// After done(), next render should write everything fresh
	log('Line 1\nLine 2');
	const output = stream.getOutput();

	// Should write all lines (not incremental)
	t.true(output.includes('Line 1'));
	t.true(output.includes('Line 2'));
});
