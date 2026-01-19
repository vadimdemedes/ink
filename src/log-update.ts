import {type Writable} from 'node:stream';
import ansiEscapes from 'ansi-escapes';
import cliCursor from 'cli-cursor';
import {
	replaceMarkerWithSave,
	getRestoreAndShowCursor,
	getHideCursor,
} from './cursor-marker.js';

export type LogUpdate = {
	clear: () => void;
	done: () => void;
	sync: (str: string) => void;
	(str: string): void;
};

export type LogUpdateOptions = {
	showCursor?: boolean;
	incremental?: boolean;
	/**
	 * Enable IME cursor position control.
	 * When enabled, the terminal's real cursor will move to the input position,
	 * allowing IME candidate windows to display at the correct position (required for CJK input).
	 * @default false
	 */
	enableImeCursor?: boolean;
};

const createStandard = (
	stream: Writable,
	{showCursor = false, enableImeCursor = false}: LogUpdateOptions = {},
): LogUpdate => {
	let previousLineCount = 0;
	let previousOutput = '';
	let hasHiddenCursor = false;
	let previousHadMarker = false;

	const render = (str: string) => {
		// Handle IME cursor mode
		if (enableImeCursor) {
			const {output: processed, hasMarker} = replaceMarkerWithSave(str);
			const output = processed + '\n';

			// Skip if nothing changed
			if (output === previousOutput && hasMarker === previousHadMarker) {
				return;
			}

			previousOutput = output;
			previousHadMarker = hasMarker;

			// Erase previous output and write new output
			// The output contains \u001B[s (save cursor) at marker position
			stream.write(ansiEscapes.eraseLines(previousLineCount) + output);

			// After writing, restore cursor to saved position and show it
			if (hasMarker) {
				stream.write(getRestoreAndShowCursor());
				hasHiddenCursor = false;
			} else if (!hasHiddenCursor) {
				// Hide cursor when no marker
				stream.write(getHideCursor());
				hasHiddenCursor = true;
			}

			previousLineCount = output.split('\n').length;
			return;
		}

		// Original behavior when IME cursor is disabled
		if (!showCursor && !hasHiddenCursor) {
			cliCursor.hide();
			hasHiddenCursor = true;
		}

		const output = str + '\n';
		if (output === previousOutput) {
			return;
		}

		previousOutput = output;
		stream.write(ansiEscapes.eraseLines(previousLineCount) + output);
		previousLineCount = output.split('\n').length;
	};

	render.clear = () => {
		stream.write(ansiEscapes.eraseLines(previousLineCount));
		previousOutput = '';
		previousLineCount = 0;
	};

	render.done = () => {
		previousOutput = '';
		previousLineCount = 0;
		previousHadMarker = false;

		if (!showCursor || enableImeCursor) {
			cliCursor.show();
			hasHiddenCursor = false;
		}
	};

	render.sync = (str: string) => {
		if (enableImeCursor) {
			const {output: processed, hasMarker} = replaceMarkerWithSave(str);
			const output = processed + '\n';
			previousOutput = output;
			previousLineCount = output.split('\n').length;
			previousHadMarker = hasMarker;
		} else {
			const output = str + '\n';
			previousOutput = output;
			previousLineCount = output.split('\n').length;
		}
	};

	return render;
};

const createIncremental = (
	stream: Writable,
	{showCursor = false, enableImeCursor = false}: LogUpdateOptions = {},
): LogUpdate => {
	let previousLines: string[] = [];
	let previousOutput = '';
	let hasHiddenCursor = false;
	let previousHadMarker = false;

	const render = (str: string) => {
		// Handle IME cursor mode - use standard (non-incremental) rendering for simplicity
		if (enableImeCursor) {
			const {output: processed, hasMarker} = replaceMarkerWithSave(str);
			const output = processed + '\n';

			if (output === previousOutput && hasMarker === previousHadMarker) {
				return;
			}

			previousOutput = output;
			previousHadMarker = hasMarker;

			// For IME mode, use simple full redraw to ensure cursor save/restore works correctly
			stream.write(ansiEscapes.eraseLines(previousLines.length) + output);

			if (hasMarker) {
				stream.write(getRestoreAndShowCursor());
				hasHiddenCursor = false;
			} else if (!hasHiddenCursor) {
				stream.write(getHideCursor());
				hasHiddenCursor = true;
			}

			previousLines = output.split('\n');
			return;
		}

		// Original incremental behavior
		if (!showCursor && !hasHiddenCursor) {
			cliCursor.hide();
			hasHiddenCursor = true;
		}

		const output = str + '\n';
		if (output === previousOutput) {
			return;
		}

		const previousCount = previousLines.length;
		const nextLines = output.split('\n');
		const nextCount = nextLines.length;
		const visibleCount = nextCount - 1;

		if (output === '\n' || previousOutput.length === 0) {
			stream.write(ansiEscapes.eraseLines(previousCount) + output);
			previousOutput = output;
			previousLines = nextLines;
			return;
		}

		const buffer: string[] = [];

		if (nextCount < previousCount) {
			buffer.push(
				ansiEscapes.eraseLines(previousCount - nextCount + 1),
				ansiEscapes.cursorUp(visibleCount),
			);
		} else {
			buffer.push(ansiEscapes.cursorUp(previousCount - 1));
		}

		for (let i = 0; i < visibleCount; i++) {
			if (nextLines[i] === previousLines[i]) {
				buffer.push(ansiEscapes.cursorNextLine);
				continue;
			}

			buffer.push(
				ansiEscapes.cursorTo(0) +
					nextLines[i] +
					ansiEscapes.eraseEndLine +
					'\n',
			);
		}

		stream.write(buffer.join(''));

		previousOutput = output;
		previousLines = nextLines;
	};

	render.clear = () => {
		stream.write(ansiEscapes.eraseLines(previousLines.length));
		previousOutput = '';
		previousLines = [];
	};

	render.done = () => {
		previousOutput = '';
		previousLines = [];
		previousHadMarker = false;

		if (!showCursor || enableImeCursor) {
			cliCursor.show();
			hasHiddenCursor = false;
		}
	};

	render.sync = (str: string) => {
		if (enableImeCursor) {
			const {output: processed, hasMarker} = replaceMarkerWithSave(str);
			const output = processed + '\n';
			previousOutput = output;
			previousLines = output.split('\n');
			previousHadMarker = hasMarker;
		} else {
			const output = str + '\n';
			previousOutput = output;
			previousLines = output.split('\n');
		}
	};

	return render;
};

const create = (
	stream: Writable,
	{
		showCursor = false,
		incremental = false,
		enableImeCursor = false,
	}: LogUpdateOptions = {},
): LogUpdate => {
	if (incremental) {
		return createIncremental(stream, {showCursor, enableImeCursor});
	}

	return createStandard(stream, {showCursor, enableImeCursor});
};

const logUpdate = {create};
export default logUpdate;
