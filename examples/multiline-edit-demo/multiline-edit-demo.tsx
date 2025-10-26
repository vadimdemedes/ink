import React, {useState, useMemo} from 'react';
import stringWidth from 'string-width';
import {render, Text, Box, useInput} from '../../src/index.js';
import {CURSOR_MARKER} from '../../src/cursor-marker.js';

/**
 * Multi-line Text Editing Demo with IME Cursor Positioning
 *
 * This demo shows how IME cursor positioning works with multi-line text.
 *
 * Usage:
 *   # With IME cursor positioning (default)
 *   npx tsx examples/multiline-edit-demo/multiline-edit-demo.tsx
 *
 *   # Without IME cursor positioning (for comparison)
 *   ENABLE_IME_CURSOR=false npx tsx examples/multiline-edit-demo/multiline-edit-demo.tsx
 *
 * When enabled, the terminal cursor moves to the actual input position,
 * allowing IME candidate windows to appear at the correct location.
 */

// Read environment variable (default: enabled)
const enableImeCursor = process.env.ENABLE_IME_CURSOR !== 'false';

const terminalWidth = 80;

// Types
type VisualLines = {
	lines: string[];
	startPositions: number[];
};

type CursorPosition = {
	row: number;
	col: number;
};

// Helper functions
function calculateVisualLines(
	text: string,
	terminalWidth: number,
): VisualLines {
	const logicalLines = text.split('\n');
	const lines: string[] = [];
	const startPositions: number[] = [];

	let charPos = 0;
	for (
		let logicalIndex = 0;
		logicalIndex < logicalLines.length;
		logicalIndex++
	) {
		const logicalLine = logicalLines[logicalIndex];
		const chars = [...logicalLine] as string[];
		let currentLine = '';
		let lineStartPos = charPos;

		for (const char of chars) {
			const testLine: string = currentLine + char;
			if (stringWidth(testLine) > terminalWidth && currentLine.length > 0) {
				startPositions.push(lineStartPos);
				lines.push(currentLine);
				lineStartPos = charPos;
				currentLine = char;
			} else {
				currentLine += char;
			}

			charPos++;
		}

		startPositions.push(lineStartPos);
		lines.push(currentLine);

		if (logicalIndex < logicalLines.length - 1) {
			charPos++;
		}
	}

	return {lines, startPositions};
}

function isInLineRange(
	cursorPos: number,
	lineIndex: number,
	startPositions: number[],
	textLength: number,
): boolean {
	const lineStart = startPositions[lineIndex];
	const isLastLine = lineIndex === startPositions.length - 1;

	if (isLastLine) {
		return cursorPos >= lineStart && cursorPos <= textLength;
	}

	const nextLineStart = startPositions[lineIndex + 1];
	return cursorPos >= lineStart && cursorPos < nextLineStart;
}

function findCursorPosition(
	cursorPos: number,
	visualLines: VisualLines,
	textLength: number,
): CursorPosition {
	for (const [i, line] of visualLines.lines.entries()) {
		if (isInLineRange(cursorPos, i, visualLines.startPositions, textLength)) {
			const lineStart = visualLines.startPositions[i];
			const lineChars = [...line];
			const posInLine = Math.min(cursorPos - lineStart, lineChars.length);
			const textBeforeCursor = lineChars.slice(0, posInLine).join('');

			return {
				row: i,
				col: stringWidth(textBeforeCursor),
			};
		}
	}

	return {row: 0, col: 0};
}

function findCharIndexAtColumn(line: string, targetCol: number): number {
	const chars = [...line];
	let charPos = 0;
	let cellPos = 0;

	for (const [i, char] of chars.entries()) {
		const charWidth = stringWidth(char);
		if (cellPos >= targetCol) {
			return i;
		}

		cellPos += charWidth;
		charPos = i + 1;
	}

	return charPos;
}

function handleVerticalMovement({
	direction,
	cursorPos,
	visualLines,
	textLength,
	targetCol,
}: {
	direction: 'up' | 'down';
	cursorPos: number;
	visualLines: VisualLines;
	textLength: number;
	targetCol: number | undefined;
}): {newCursorPos: number; newTargetCol: number} {
	const currentPosition = findCursorPosition(
		cursorPos,
		visualLines,
		textLength,
	);
	const desiredCol = targetCol ?? currentPosition.col;

	const targetRow =
		direction === 'up'
			? Math.max(0, currentPosition.row - 1)
			: Math.min(visualLines.lines.length - 1, currentPosition.row + 1);

	if (targetRow === currentPosition.row) {
		return {newCursorPos: cursorPos, newTargetCol: desiredCol};
	}

	const targetLine = visualLines.lines[targetRow];
	const targetLineStart = visualLines.startPositions[targetRow];
	const charIndex = findCharIndexAtColumn(targetLine, desiredCol);
	const newCursorPos = targetLineStart + charIndex;

	return {
		newCursorPos: Math.min(newCursorPos, textLength),
		newTargetCol: desiredCol,
	};
}

function MultilineCursorTest() {
	const initialText =
		'これは長いテキストのサンプルです。ターミナルの幅を超えて自動的に折り返されることを確認できます。全角文字は1文字あたり2セル分の幅を占めるため、40文字以上で折り返しが発生します。\n' +
		'The above line is in Japanese and says: "This is a sample of long text. You can see it automatically wraps when it exceeds the terminal width. Full-width characters occupy 2 cells per character, so wrapping occurs after 40+ characters."';
	const [text, setText] = useState(initialText);
	const [cursorPos, setCursorPos] = useState(text.length);
	const [targetCol, setTargetCol] = useState<number | undefined>();

	// Calculate visual lines (memoized)
	const visualLines = useMemo(
		() => calculateVisualLines(text, terminalWidth),
		[text],
	);

	useInput((input, key) => {
		if (key.ctrl && input === 'c') {
			return;
		}

		if (key.leftArrow) {
			setCursorPos(Math.max(0, cursorPos - 1));
			setTargetCol(undefined);
		} else if (key.rightArrow) {
			setCursorPos(Math.min(text.length, cursorPos + 1));
			setTargetCol(undefined);
		} else if (key.backspace || key.delete) {
			if (cursorPos > 0) {
				setText(text.slice(0, cursorPos - 1) + text.slice(cursorPos));
				setCursorPos(cursorPos - 1);
			}

			setTargetCol(undefined);
		} else if (key.return) {
			setText(text.slice(0, cursorPos) + '\n' + text.slice(cursorPos));
			setCursorPos(cursorPos + 1);
			setTargetCol(undefined);
		} else if (key.upArrow || key.downArrow) {
			const direction = key.upArrow ? 'up' : 'down';
			const {newCursorPos, newTargetCol} = handleVerticalMovement({
				direction,
				cursorPos,
				visualLines,
				textLength: text.length,
				targetCol,
			});
			setCursorPos(newCursorPos);
			setTargetCol(newTargetCol);
		} else if (!key.tab) {
			setText(text.slice(0, cursorPos) + input + text.slice(cursorPos));
			setCursorPos(cursorPos + input.length);
			setTargetCol(undefined);
		}
	});

	const logicalLines = text.split('\n');
	const {row: visualRow, col: visualCol} = findCursorPosition(
		cursorPos,
		visualLines,
		text.length,
	);

	return (
		<Box flexDirection="column">
			<Text color="cyan">Multi-line Cursor Position Test</Text>
			<Text color="gray">
				Text wraps at {terminalWidth} cells (full-width chars = 2 cells)
			</Text>
			<Text> </Text>

			<Box
				flexDirection="column"
				borderStyle="single"
				borderColor="blue"
				padding={1}
			>
				{visualLines.lines.map((line, index) => {
					const lineKey = `${index}-${line.slice(0, 20)}-${line.length}`;

					if (index === visualRow) {
						// Show cursor on this line
						const lineChars = [...line];
						const cursorCharIndex = findCharIndexAtColumn(line, visualCol);

						const before = lineChars.slice(0, cursorCharIndex).join('');
						const cursor = lineChars[cursorCharIndex] ?? ' ';
						const after = lineChars.slice(cursorCharIndex + 1).join('');

						// Empty line with cursor
						if (line === '' && before === '' && after === '') {
							return (
								<Text key={lineKey}>
									{enableImeCursor && CURSOR_MARKER}
									<Text inverse> </Text>
								</Text>
							);
						}

						return (
							<Text key={lineKey}>
								{before}
								{enableImeCursor && CURSOR_MARKER}
								<Text inverse>{cursor}</Text>
								{after}
							</Text>
						);
					}

					// Empty line without cursor - show as blank line
					if (line === '') {
						return <Text key={lineKey}> </Text>;
					}

					return <Text key={lineKey}>{line}</Text>;
				})}
			</Box>

			<Text> </Text>
			<Text color="yellow">Cursor Info:</Text>
			<Text>
				Logical position: {cursorPos} / {text.length} characters
			</Text>
			<Text>
				Visual position: row {visualRow}, col {visualCol} cells
			</Text>
			<Text> Total visual lines: {visualLines.lines.length}</Text>
			<Text> Logical lines (with \\n): {logicalLines.length}</Text>
			{visualLines.startPositions.length > 0 && (
				<>
					<Text>
						Line {visualRow} starts at char:{' '}
						{visualLines.startPositions[visualRow]}
					</Text>
					<Text>
						Line {visualRow} content: "{visualLines.lines[visualRow]}" (length:{' '}
						{visualLines.lines[visualRow].length})
					</Text>
				</>
			)}

			<Text> </Text>
			<Text color="green">Controls:</Text>
			<Text> Type text to add at cursor position</Text>
			<Text> Enter to insert newline</Text>
			<Text> Arrow keys to move cursor (Up/Down/Left/Right)</Text>
			<Text> Backspace to delete</Text>
			<Text> Ctrl+C to exit</Text>

			<Text> </Text>
			<Text bold color={enableImeCursor ? 'green' : 'yellow'}>
				Current Mode: IME Cursor {enableImeCursor ? 'ENABLED' : 'DISABLED'}
			</Text>
			{enableImeCursor ? (
				<>
					<Text color="green">
						✓ Terminal cursor moves to the actual input position
					</Text>
					<Text color="green">
						✓ IME candidate window appears at the correct location
					</Text>
					<Text color="gray">
						(Terminal cursor should be at the white █ above)
					</Text>
				</>
			) : (
				<>
					<Text color="yellow">
						⚠ Terminal cursor stays at the end of output
					</Text>
					<Text color="yellow">
						⚠ IME candidate window appears at wrong position
					</Text>
					<Text color="gray">
						(Compare with ENABLE_IME_CURSOR=true to see the difference)
					</Text>
				</>
			)}
		</Box>
	);
}

render(<MultilineCursorTest />, {enableImeCursor});
