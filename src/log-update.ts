import {type Writable} from 'node:stream';
import process from 'node:process';
import ansiEscapes from 'ansi-escapes';
import cliCursor from 'cli-cursor';

const enterSynchronizedOutput = '\u001B[?2026h';
const exitSynchronizedOutput = '\u001B[?2026l';

export type LogUpdate = {
	clear: () => void;
	done: () => void;
	sync: (str: string) => void;
	(str: string): void;
};

const create = (
	stream: Writable,
	{
		showCursor = false,
		alternateBuffer = false,
		alternateBufferAlreadyActive = false,
		getRows = () => 0,
	}: {
		showCursor?: boolean;
		alternateBuffer?: boolean;
		alternateBufferAlreadyActive?: boolean;
		getRows?: () => number;
	} = {},
): LogUpdate => {
	let previousLineCount = 0;
	let previousOutput = '';
	// Keep track of the actual previous output rendered to the alternate buffer
	// which may be truncated to the terminal height.
	let previousOutputAlternateBuffer = '';
	let hasHiddenCursor = false;

	if (alternateBuffer && !alternateBufferAlreadyActive) {
		stream.write(ansiEscapes.enterAlternativeScreen);
	}

	const render = (str: string) => {
		if (!showCursor && !hasHiddenCursor) {
			cliCursor.hide();
			hasHiddenCursor = true;
		}

		const output = str + '\n';

		if (alternateBuffer) {
			let alternateBufferOutput = output;
			const rows = getRows() ?? 0;
			if (rows > 0) {
				const lines = str.split('\n');
				const lineCount = lines.length;
				// Only write the last `rows` lines as the alternate buffer
				// will not scroll so all we accomplish by writing more
				// content is risking flicker and confusing the terminal about
				// the cursor position.
				if (lineCount > rows) {
					alternateBufferOutput = lines.slice(-rows).join('\n');
				}

				// Only write the last `rows` lines as the alternate buffer
				// will not scroll so all we accomplish by writing more
				// content is risking flicker and confusing the terminal about
				// the cursor position.
				if (lineCount > rows) {
					alternateBufferOutput = str.split('\n').slice(-rows).join('\n');
				}
			}

			// In alternate buffer mode we need to re-render based on whether content
			// visible within the clipped alternate output buffer has changed even
			// if the entire output string has not changed.
			if (alternateBufferOutput !== previousOutputAlternateBuffer) {
				// Unfortunately, eraseScreen does not work correctly in iTerm2 so we
				// have to use clearTerminal instead.
				const eraseOperation =
					process.env['TERM_PROGRAM'] === 'iTerm.app'
						? ansiEscapes.clearTerminal
						: ansiEscapes.eraseScreen;
				stream.write(
					enterSynchronizedOutput +
						ansiEscapes.cursorTo(0, 0) +
						eraseOperation +
						alternateBufferOutput +
						exitSynchronizedOutput,
				);
				previousOutputAlternateBuffer = alternateBufferOutput;
			}

			previousOutput = output;
			return;
		}

		previousOutput = output;
		stream.write(ansiEscapes.eraseLines(previousLineCount) + output);
		previousLineCount = output.split('\n').length;
	};

	render.clear = () => {
		if (alternateBuffer) {
			const eraseOperation =
				process.env['TERM_PROGRAM'] === 'iTerm.app'
					? ansiEscapes.clearTerminal
					: ansiEscapes.eraseScreen;
			stream.write(eraseOperation);
			previousOutput = '';
			return;
		}

		stream.write(ansiEscapes.eraseLines(previousLineCount));
		previousOutput = '';
		previousLineCount = 0;
	};

	render.done = () => {
		const lastFrame = previousOutput;
		previousOutput = '';
		previousLineCount = 0;

		if (!showCursor) {
			cliCursor.show();
			hasHiddenCursor = false;
		}

		if (alternateBuffer) {
			stream.write(ansiEscapes.exitAlternativeScreen);
			// The last frame was rendered to the alternate buffer.
			// We need to render it again to the main buffer. If apps do not
			// want this behavior, they can make sure the last frame is empty
			// before unmounting.
			stream.write(lastFrame);
		}
	};

	render.sync = (str: string) => {
		if (alternateBuffer) {
			previousOutput = str;
			return;
		}

		const output = str + '\n';
		previousOutput = output;
		previousLineCount = output.split('\n').length;
	};

	return render;
};

const logUpdate = {create};
export default logUpdate;
