// Minimal terminal-state reducer for tests.
//
// Some bugs (e.g. #973) are only visible after modelling cursor movement and
// erases: a line can be written to the raw output stream and then erased by a
// later cursor-up + erase sequence, so a substring check on the raw bytes
// cannot tell whether it is still on screen. This reducer replays the handful
// of escape sequences Ink emits and returns the lines that remain visible
// (scrollback + viewport), which is what the user would actually see.
//
// It deliberately supports only the sequences Ink produces. It is not a general
// terminal emulator.

const esc = '\u001B';

const parseParams = (raw: string): number[] =>
	raw.split(';').map(value => (value === '' ? Number.NaN : Number(value)));

export const reconstructTerminalLines = (
	output: string,
	rows: number,
): string[] => {
	const scrollback: string[] = [];
	const screen: string[] = Array.from({length: rows}, () => '');
	let row = 0;
	let col = 0;

	const writeChar = (char: string): void => {
		const line = screen[row] ?? '';
		const padded =
			line.length < col ? line + ' '.repeat(col - line.length) : line;
		screen[row] = padded.slice(0, col) + char + padded.slice(col + 1);
		col += 1;
	};

	const lineFeed = (): void => {
		row += 1;
		if (row >= rows) {
			scrollback.push(screen.shift() ?? '');
			screen.push('');
			row = rows - 1;
		}
	};

	for (let i = 0; i < output.length; i++) {
		const char = output[i]!;

		if (char === esc && output[i + 1] === '[') {
			// Parse a CSI sequence: esc [ params finalByte
			let j = i + 2;
			let params = '';
			while (j < output.length && /[\d;?]/.test(output[j]!)) {
				params += output[j];
				j++;
			}

			const finalByte = output[j] ?? '';
			i = j; // Advance past the whole sequence (loop's i++ skips finalByte)

			if (params.startsWith('?')) {
				// Private modes (cursor visibility, synchronized update) — no buffer effect.
				continue;
			}

			const values = parseParams(params);
			const first = Number.isNaN(values[0]!) ? undefined : values[0]!;

			switch (finalByte) {
				case 'A': {
					row = Math.max(0, row - (first ?? 1));
					break;
				}

				case 'B': {
					row = Math.min(rows - 1, row + (first ?? 1));
					break;
				}

				case 'E': {
					row = Math.min(rows - 1, row + (first ?? 1));
					col = 0;
					break;
				}

				case 'F': {
					row = Math.max(0, row - (first ?? 1));
					col = 0;
					break;
				}

				case 'G': {
					col = (first ?? 1) - 1;
					break;
				}

				case 'd': {
					row = (first ?? 1) - 1;
					break;
				}

				case 'H':
				case 'f': {
					const second = Number.isNaN(values[1]!) ? undefined : values[1]!;
					row = (first ?? 1) - 1;
					col = (second ?? 1) - 1;
					break;
				}

				case 'J': {
					if (first === 2) {
						for (let k = 0; k < rows; k++) {
							screen[k] = '';
						}
					} else if (first === 3) {
						scrollback.length = 0;
					} else {
						// Clear from cursor to end of screen.
						screen[row] = (screen[row] ?? '').slice(0, col);
						for (let k = row + 1; k < rows; k++) {
							screen[k] = '';
						}
					}

					break;
				}

				case 'K': {
					if (first === 2) {
						screen[row] = '';
					} else if (first === 1) {
						screen[row] = ' '.repeat(col) + (screen[row] ?? '').slice(col);
					} else {
						screen[row] = (screen[row] ?? '').slice(0, col);
					}

					break;
				}

				default: {
					// Unsupported sequence — ignore.
					break;
				}
			}

			continue;
		}

		switch (char) {
			case '\r': {
				col = 0;
				break;
			}

			case '\n': {
				lineFeed();
				break;
			}

			case '\b': {
				col = Math.max(0, col - 1);
				break;
			}

			case esc: {
				// A lone esc not starting a CSI we handle — skip it.
				break;
			}

			default: {
				if (char >= ' ') {
					writeChar(char);
				}
			}
		}
	}

	return [...scrollback, ...screen].map(line => line.replace(/\s+$/, ''));
};
