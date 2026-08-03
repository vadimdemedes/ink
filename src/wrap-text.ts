import wrapAnsi from 'wrap-ansi';
import cliTruncate from 'cli-truncate';
import stripAnsi from 'strip-ansi';
import {type Styles} from './styles.js';

const cache: Record<string, string> = {};

const wrapText = (
	text: string,
	maxWidth: number,
	wrapType: Styles['textWrap'],
): string => {
	const cacheKey = text + String(maxWidth) + String(wrapType);
	const cachedText = cache[cacheKey];

	if (cachedText) {
		return cachedText;
	}

	let wrappedText = text;

	if (wrapType === 'wrap') {
		wrappedText = wrapAnsi(text, maxWidth, {
			trim: false,
			hard: true,
		});
	}

	if (wrapType === 'hard') {
		wrappedText = wrapAnsi(text, maxWidth, {
			trim: false,
			hard: true,
			wordWrap: false,
		});
	}

	if (wrapType!.startsWith('truncate')) {
		let position: 'end' | 'middle' | 'start' = 'end';

		if (wrapType === 'truncate-middle') {
			position = 'middle';
		}

		if (wrapType === 'truncate-start') {
			position = 'start';
		}

		wrappedText = cliTruncate(text, maxWidth, {position});
	}

	cache[cacheKey] = wrappedText;

	return wrappedText;
};

export default wrapText;

export type TextBoundary = {
	kind: 'soft' | 'hard';
	joiner: string;
};

/**
Wrapping metadata of a single output line, relative to the source text.
*/
export type WrappedLineMetadata = {
	/**
	Visible offset in the source text where this line's content starts.
	*/
	visibleStart: number;

	/**
	Visible length of this line's content.
	*/
	visibleLength: number;

	/**
	False for whitespace-only lines that merely continue a whitespace run from
	the source (e.g. indent continuation after a wrap), which should not
	contribute to copied text.
	*/
	selectable: boolean;

	/**
	Boundary between the previous line and this one. Undefined for the first
	line. `'hard'` boundaries come from explicit newlines in the source;
	`'soft'` ones from wrapping, with the consumed whitespace as the joiner.
	*/
	boundary?: TextBoundary;
};

/**
Like `wrapText`, but additionally reports how each output line maps back to
the source text so callers can preserve per-character metadata across
wrapping.
*/
export const wrapTextWithMetadata = (
	text: string,
	maxWidth: number,
	wrapType: Styles['textWrap'],
	shouldWrap = true,
): {text: string; lines: WrappedLineMetadata[]} => {
	const sourceLines = text.replaceAll('\r\n', '\n').split('\n');
	const lines: string[] = [];
	const metadata: WrappedLineMetadata[] = [];
	let sourceBase = 0;

	for (const sourceLine of sourceLines) {
		const wrappedLines = (
			shouldWrap ? wrapText(sourceLine, maxWidth, wrapType) : sourceLine
		).split('\n');
		const visibleSource = stripAnsi(sourceLine);
		let sourceOffset = 0;

		for (const [wrappedLineIndex, wrappedLine] of wrappedLines.entries()) {
			const visibleLine = stripAnsi(wrappedLine);

			const separatorRow =
				sourceOffset > 0 &&
				visibleLine.length > 0 &&
				/^\s+$/u.test(visibleLine) &&
				/\S/u.test(visibleSource.slice(sourceOffset));

			const sourceSeparator = separatorRow
				? (/^\s+/u.exec(visibleSource.slice(sourceOffset))?.[0] ?? '').slice(
						0,
						visibleLine.length,
					)
				: '';

			const lineOffset = separatorRow
				? sourceOffset
				: visibleSource.indexOf(visibleLine, sourceOffset);
			const resolvedOffset = lineOffset === -1 ? sourceOffset : lineOffset;

			let boundary: TextBoundary | undefined;

			if (lines.length > 0) {
				boundary =
					wrappedLineIndex === 0
						? {kind: 'hard', joiner: '\n'}
						: {
								kind: 'soft',
								joiner: separatorRow
									? sourceSeparator
									: visibleSource.slice(sourceOffset, resolvedOffset),
							};
			}

			lines.push(wrappedLine);
			metadata.push({
				visibleStart: sourceBase + resolvedOffset,
				visibleLength: visibleLine.length,
				selectable: !separatorRow,
				boundary,
			});

			sourceOffset = separatorRow
				? sourceOffset + sourceSeparator.length
				: resolvedOffset + visibleLine.length;
		}

		sourceBase += visibleSource.length + 1;
	}

	return {text: lines.join('\n'), lines: metadata};
};
