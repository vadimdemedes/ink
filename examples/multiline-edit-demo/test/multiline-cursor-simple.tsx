import process from 'node:process';
import stringWidth from 'string-width';

// Calculate visual cursor position from text and cursor position
function calculateVisualPosition(
	text: string,
	cursorPos: number,
	terminalWidth: number,
): {visualRow: number; visualCol: number} {
	const logicalLines = text.split('\n');
	const visualLines: string[] = [];
	const visualLineStartPos: number[] = [];

	let charPos = 0;
	for (let logicalIndex = 0; logicalIndex < logicalLines.length; logicalIndex++) {
		const logicalLine = logicalLines[logicalIndex];
		const chars = Array.from(logicalLine);
		let currentLine = '';
		let lineStartPos = charPos;

		for (const char of chars) {
			const testLine = currentLine + char;
			if (stringWidth(testLine) > terminalWidth && currentLine.length > 0) {
				visualLineStartPos.push(lineStartPos);
				visualLines.push(currentLine);
				lineStartPos = charPos;
				currentLine = char;
			} else {
				currentLine += char;
			}

			charPos++;
		}

		visualLineStartPos.push(lineStartPos);
		visualLines.push(currentLine);

		if (logicalIndex < logicalLines.length - 1) {
			charPos++;
		}
	}

	// Find which visual line contains the cursor
	let visualRow = 0;
	let visualCol = 0;

	for (let index = 0; index < visualLines.length; index++) {
		const lineStart = visualLineStartPos[index];
		const lineContent = visualLines[index];
		const lineChars = Array.from(lineContent);

		const inRange =
			index < visualLines.length - 1
				? cursorPos >= lineStart && cursorPos < visualLineStartPos[index + 1]
				: cursorPos >= lineStart && cursorPos <= text.length;

		if (inRange) {
			visualRow = index;
			const posInLine = Math.min(cursorPos - lineStart, lineChars.length);
			const textBeforeCursor = lineChars.slice(0, posInLine).join('');
			visualCol = stringWidth(textBeforeCursor);
			break;
		}
	}

	return {visualRow, visualCol};
}

const testName = process.argv[2];
const tests: Record<
	string,
	{text: string; cursorPos: number; expected: {row: number; col: number}}
> = {
	'empty-text': {
		text: '',
		cursorPos: 0,
		expected: {row: 0, col: 0},
	},
	'single-line-end': {
		text: 'Hello',
		cursorPos: 5,
		expected: {row: 0, col: 5},
	},
	'two-lines-second-line': {
		text: 'abc\ndef',
		cursorPos: 7, // After 'def'
		expected: {row: 1, col: 3},
	},
	'empty-line': {
		text: 'abc\n\ndef',
		cursorPos: 4, // On empty line
		expected: {row: 1, col: 0},
	},
	'fullwidth-chars': {
		text: 'あいう',
		cursorPos: 3,
		expected: {row: 0, col: 6}, // 3 fullwidth chars = 6 cells
	},
	'mixed-width': {
		text: 'aあb',
		cursorPos: 3,
		expected: {row: 0, col: 4}, // a(1) + あ(2) + b(1) = 4 cells
	},
	'cursor-on-newline': {
		text: 'abc\ndef',
		cursorPos: 3, // Position of newline character after 'abc'
		expected: {row: 0, col: 3}, // At end of first line
	},
	'multiple-empty-lines': {
		text: 'a\n\n\nb',
		cursorPos: 2, // Second newline
		expected: {row: 1, col: 0}, // On first empty line
	},
	'line-start': {
		text: 'abc\ndef',
		cursorPos: 4, // Start of 'def'
		expected: {row: 1, col: 0},
	},
	'text-start': {
		text: 'abc',
		cursorPos: 0,
		expected: {row: 0, col: 0},
	},
	'long-line-wrap': {
		text: 'a'.repeat(100), // 100 chars, wraps at 80
		cursorPos: 90,
		expected: {row: 1, col: 10}, // Second line, 10 chars in
	},
	'fullwidth-wrap': {
		text: 'あ'.repeat(50), // 100 cells, wraps at 80
		cursorPos: 45, // 45th character = 90 cells
		expected: {row: 1, col: 10}, // Second line, 10 cells in
	},
	'fullwidth-wrap-boundary': {
		text: 'あ'.repeat(50), // 100 cells
		cursorPos: 40, // 40th character = 80 cells exactly
		expected: {row: 1, col: 0}, // Wraps to start of second line
	},
	'mixed-width-wrap': {
		text: 'a'.repeat(40) + 'あ'.repeat(25), // 40 + 50 = 90 cells
		cursorPos: 50, // After all 'a's and 10 'あ's = 60 cells
		expected: {row: 0, col: 60},
	},
	'cursor-at-wrap-point': {
		text: 'a'.repeat(85), // Wraps at 80
		cursorPos: 80, // Exactly at wrap point
		expected: {row: 1, col: 0}, // Start of second line
	},
};

const test = tests[testName];
if (!test) {
	console.error(`Unknown test: ${testName}`);
	process.exit(1);
}

const result = calculateVisualPosition(test.text, test.cursorPos, 80);

if (result.visualRow === test.expected.row && result.visualCol === test.expected.col) {
	console.log(`PASS: row=${result.visualRow}, col=${result.visualCol}`);
	process.exit(0);
} else {
	console.error(
		`FAIL: expected row=${test.expected.row}, col=${test.expected.col}, got row=${result.visualRow}, col=${result.visualCol}`,
	);
	process.exit(1);
}
