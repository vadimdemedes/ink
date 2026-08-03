import sliceAnsi from 'slice-ansi';
import stringWidth from 'string-width';
import stripAnsi from 'strip-ansi';
import {
	type AnsiCode,
	type StyledChar,
	styledCharsFromTokens,
	styledCharsToString,
	tokenize,
} from '@alcalzone/ansi-tokenize';
import {
	type LineSemantics,
	type OutputTransformer,
} from './render-node-to-output.js';
import {
	type FrameBoundary,
	type FrameCell,
	type ScreenSelection,
} from './frame-controller.js';

// Background applied to selected cells. Appended after a cell's existing styles
// so the foreground is preserved and this background wins at the terminal.
const selectionBackground: AnsiCode = {
	type: 'ansi',
	code: '\u001B[48;5;240m',
	endCode: '\u001B[49m',
};

// Linear reading-order selection: whole rows between the first and last, partial
// on the first/last row. Coordinates are screen cells in the composited frame;
// the frame controller normalizes selections to reading order before they get here.
const isCellSelected = (
	x: number,
	y: number,
	selection: ScreenSelection,
): boolean => {
	if (y < selection.sy || y > selection.ey) {
		return false;
	}

	if (selection.sy === selection.ey) {
		return x >= selection.sx && x <= selection.ex;
	}

	if (y === selection.sy) {
		return x >= selection.sx;
	}

	if (y === selection.ey) {
		return x <= selection.ex;
	}

	return true;
};

/**
"Virtual" output class

Handles the positioning and saving of the output of each node in the tree. Also responsible for applying transformations to each character of the output.

Used to generate the final output of all nodes before writing it to actual output stream (e.g. stdout)
*/

type Options = {
	width: number;
	height: number;
};

type Operation = WriteOperation | ClipOperation | UnclipOperation;

type WriteOperation = {
	type: 'write';
	x: number;
	y: number;
	text: string;
	transformers: OutputTransformer[];
	selectable?: boolean;
	semantics?: LineSemantics[];
};

type ClipOperation = {
	type: 'clip';
	clip: Clip;
};

type Clip = {
	x1: number | undefined;
	x2: number | undefined;
	y1: number | undefined;
	y2: number | undefined;
};

type UnclipOperation = {
	type: 'unclip';
};

class OutputCaches {
	widths = new Map<string, number>();
	blockWidths = new Map<string, number>();
	styledChars = new Map<string, StyledChar[]>();

	getStyledChars(line: string): StyledChar[] {
		let cached = this.styledChars.get(line);
		if (cached === undefined) {
			cached = styledCharsFromTokens(tokenize(line));
			this.styledChars.set(line, cached);
		}

		return cached;
	}

	getStringWidth(text: string): number {
		let cached = this.widths.get(text);
		if (cached === undefined) {
			cached = stringWidth(text);
			this.widths.set(text, cached);
		}

		return cached;
	}

	getWidestLine(text: string): number {
		let cached = this.blockWidths.get(text);
		if (cached === undefined) {
			let lineWidth = 0;
			for (const line of text.split('\n')) {
				lineWidth = Math.max(lineWidth, this.getStringWidth(line));
			}

			cached = lineWidth;
			this.blockWidths.set(text, cached);
		}

		return cached;
	}
}

export default class Output {
	width: number;
	height: number;

	private readonly operations: Operation[] = [];
	private readonly caches: OutputCaches = new OutputCaches();

	constructor(options: Options) {
		const {width, height} = options;

		this.width = width;
		this.height = height;
	}

	write(
		x: number,
		y: number,
		text: string,
		options: {
			transformers: OutputTransformer[];
			selectable?: boolean;
			semantics?: LineSemantics[];
		},
	): void {
		const {transformers, selectable, semantics} = options;

		if (!text) {
			return;
		}

		this.operations.push({
			type: 'write',
			x,
			y,
			text,
			transformers,
			selectable,
			semantics,
		});
	}

	clip(clip: Clip) {
		this.operations.push({
			type: 'clip',
			clip,
		});
	}

	unclip() {
		this.operations.push({
			type: 'unclip',
		});
	}

	get(
		selection?: ScreenSelection,
		captureCells = false,
	): {
		output: string;
		height: number;
		cells?: FrameCell[][];
		boundaries?: Array<Array<FrameBoundary | undefined>>;
	} {
		// Cells are selectable unless a write marked them otherwise (e.g.
		// `selectable={false}` text or box backgrounds). Tracked only when a
		// selection is applied or cells are captured.
		const trackSemantics = captureCells || selection !== undefined;
		const nonSelectable = trackSemantics ? new Set<string>() : undefined;
		const flowGrid: Array<Array<number | undefined>> | undefined = captureCells
			? []
			: undefined;
		const boundaryStamps = captureCells
			? new Map<string, FrameBoundary>()
			: undefined;

		// Initialize output array with a specific set of rows, so that margin/padding at the bottom is preserved
		const output: StyledChar[][] = [];

		for (let y = 0; y < this.height; y++) {
			const row: StyledChar[] = [];

			for (let x = 0; x < this.width; x++) {
				row.push({
					type: 'char',
					value: ' ',
					fullWidth: false,
					styles: [],
				});
			}

			output.push(row);
		}

		const clips: Clip[] = [];

		for (const operation of this.operations) {
			if (operation.type === 'clip') {
				clips.push(operation.clip);
			}

			if (operation.type === 'unclip') {
				clips.pop();
			}

			if (operation.type === 'write') {
				const {text, transformers, selectable, semantics} = operation;
				let {x, y} = operation;
				let lines = text.split('\n');
				let firstLineIndex = 0;
				// Visible columns removed from the front by horizontal clipping,
				// expressed in source code units for semantics lookups.
				let codeUnitsShift = 0;

				const clip = clips.at(-1);

				if (clip) {
					const clipHorizontally =
						typeof clip?.x1 === 'number' && typeof clip?.x2 === 'number';

					const clipVertically =
						typeof clip?.y1 === 'number' && typeof clip?.y2 === 'number';

					// If text is positioned outside of clipping area altogether,
					// skip to the next operation to avoid unnecessary calculations
					if (clipHorizontally) {
						const width = this.caches.getWidestLine(text);

						if (x + width < clip.x1! || x > clip.x2!) {
							continue;
						}
					}

					if (clipVertically) {
						const height = lines.length;

						if (y + height < clip.y1! || y > clip.y2!) {
							continue;
						}
					}

					if (clipHorizontally) {
						const from = x < clip.x1! ? clip.x1! - x : 0;

						if (from > 0 && semantics) {
							codeUnitsShift = stripAnsi(
								sliceAnsi(lines[0] ?? '', 0, from),
							).length;
						}

						lines = lines.map(line => {
							const width = this.caches.getStringWidth(line);
							const to = x + width > clip.x2! ? clip.x2! - x : width;

							return sliceAnsi(line, from, to);
						});

						if (x < clip.x1!) {
							x = clip.x1!;
						}
					}

					if (clipVertically) {
						const from = y < clip.y1! ? clip.y1! - y : 0;
						const height = lines.length;
						const to = y + height > clip.y2! ? clip.y2! - y : height;

						lines = lines.slice(from, to);
						firstLineIndex = from;

						if (y < clip.y1!) {
							y = clip.y1!;
						}
					}
				}

				let offsetY = 0;

				for (let [index, line] of lines.entries()) {
					const currentLine = output[y + offsetY];

					// Line can be missing if `text` is taller than height of pre-initialized `this.output`
					if (!currentLine) {
						continue;
					}

					for (const transformer of transformers) {
						line = transformer(line, index);
					}

					const characters = this.caches.getStyledChars(line);
					let offsetX = x;

					// Nothing to write (e.g. line was clipped away).
					if (characters.length === 0) {
						offsetY++;
						continue;
					}

					const lineSemantics = semantics?.[firstLineIndex + index];
					const rowIndex = y + offsetY;
					let codeIndex = codeUnitsShift;

					const spaceCell: StyledChar = {
						type: 'char',
						value: ' ',
						fullWidth: false,
						styles: [],
					};

					// Wide characters (e.g. CJK) occupy two cells: a leading
					// cell with the character and a trailing placeholder with
					// value ''. When an overlapping write lands in the middle
					// of a wide character, the boundary cells need cleanup so
					// the terminal never renders a half-visible wide character.
					if (
						currentLine[offsetX]?.value === '' &&
						offsetX > 0 &&
						this.caches.getStringWidth(currentLine[offsetX - 1]?.value ?? '') >
							1
					) {
						currentLine[offsetX - 1] = spaceCell;
					}

					for (const character of characters) {
						currentLine[offsetX] = character;

						// Determine printed width using string-width to align with measurement
						const characterWidth = Math.max(
							1,
							this.caches.getStringWidth(character.value),
						);

						// For multi-column characters, clear following cells to avoid stray spaces/artifacts
						if (characterWidth > 1) {
							for (let index = 1; index < characterWidth; index++) {
								currentLine[offsetX + index] = {
									type: 'char',
									value: '',
									fullWidth: false,
									styles: character.styles,
								};
							}
						}

						if (trackSemantics) {
							// Semantic lookups are indexed by source code units, while
							// grid positions are terminal columns (wide characters
							// occupy several columns for one code unit).
							let cellSelectable = selectable ?? true;
							let flowId: number | undefined;
							let boundary: FrameBoundary | undefined;

							if (lineSemantics) {
								cellSelectable = lineSemantics.selectable[codeIndex] ?? true;
								flowId = lineSemantics.flowIds[codeIndex];
								boundary = lineSemantics.boundariesAfter[codeIndex];
							}

							for (
								let cellColumn = offsetX;
								cellColumn < offsetX + characterWidth;
								cellColumn++
							) {
								if (!cellSelectable) {
									nonSelectable?.add(`${rowIndex},${cellColumn}`);
								}

								if (flowGrid && flowId !== undefined) {
									const existingRow = flowGrid[rowIndex];
									const gridRow = existingRow ?? [];

									if (!existingRow) {
										flowGrid[rowIndex] = gridRow;
									}

									gridRow[cellColumn] = flowId;
								}

								if (boundaryStamps && boundary) {
									boundaryStamps.set(`${rowIndex},${cellColumn}`, boundary);
								}
							}

							codeIndex += character.value.length;
						}

						offsetX += characterWidth;
					}

					if (currentLine[offsetX]?.value === '') {
						currentLine[offsetX] = spaceCell;
					}

					offsetY++;
				}
			}
		}

		// Apply the selection highlight before serialization. Selected slots are
		// replaced with new cell objects (never mutated in place) because cells
		// reference StyledChar objects cached and shared across identical lines,
		// so mutating one would leak the highlight onto other on-screen text.
		if (selection) {
			for (const [y, row] of output.entries()) {
				for (let x = 0; x < row.length; x++) {
					if (!isCellSelected(x, y, selection)) {
						continue;
					}

					// Non-selectable cells (e.g. `selectable={false}` text or box
					// backgrounds) are excluded from what a selection copies, so
					// they are not highlighted either.
					if (nonSelectable?.has(`${y},${x}`)) {
						continue;
					}

					const cell = row[x];

					if (cell) {
						row[x] = {
							...cell,
							styles: [...cell.styles, selectionBackground],
						};
					}
				}
			}
		}

		// Project the composited cells for frame consumers, stripping internal
		// style data. Only runs when a consumer opted in via subscribe(), so the
		// default render path pays no extra cost.
		const cells = captureCells
			? output.map((row, rowIndex) => {
					const frameRow: FrameCell[] = [];

					for (const [column, cell] of row.entries()) {
						frameRow.push({
							value: cell?.value ?? ' ',
							fullWidth: cell?.fullWidth ?? false,
							selectable: !nonSelectable!.has(`${rowIndex},${column}`),
							flowId: flowGrid?.[rowIndex]?.[column],
						});
					}

					return frameRow;
				})
			: undefined;

		const boundaries = captureCells
			? output.map((row, rowIndex) => {
					const boundaryRow: Array<FrameBoundary | undefined> = [];

					for (let column = 0; column < row.length; column++) {
						boundaryRow.push(boundaryStamps!.get(`${rowIndex},${column}`));
					}

					return boundaryRow;
				})
			: undefined;

		const generatedOutput = output
			.map(line => {
				// See https://github.com/vadimdemedes/ink/pull/564#issuecomment-1637022742
				const lineWithoutEmptyItems = line.filter(item => item !== undefined);

				return styledCharsToString(lineWithoutEmptyItems).trimEnd();
			})
			.join('\n');

		return {
			output: generatedOutput,
			height: output.length,
			cells,
			boundaries,
		};
	}
}
