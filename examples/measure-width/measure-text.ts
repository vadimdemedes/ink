import fs from 'node:fs';
import process from 'node:process';
import defaultStringWidth from 'string-width';

const debugMode = true;
const debugLog = false;

if (debugLog) {
	fs.writeFileSync('log.txt', '');
}

export const log = (message: string) => {
	if (debugLog) {
		fs.appendFileSync('log.txt', `${message}\n`);
	}
};

const saveCursorPosition = '\u001B[s';
const restoreCursorPosition = '\u001B[u';
const requestCursorPosition = '\u001B[6n';

const debugSkipMeasurement = false;
const isAppleTerminal = process.env.TERM_PROGRAM === 'Apple_Terminal';
const measureEverything1 = false;

class MeasurementEngine {
	private readonly queue: Array<{s: string; resolve: (width: number) => void}> =
		[];

	private isMeasuring = false;

	private buffer = '';

	private currentItem:
		| {s: string; resolve: (width: number) => void}
		| undefined = undefined;

	private isProcessingBuffer = false;

	constructor() {
		process.stdin.on('data', (data: Uint8Array) => {
			this.buffer += data.toString();
			void this.processBuffer();
		});
	}

	async measure(s: string): Promise<number> {
		return new Promise(resolve => {
			this.queue.push({s, resolve});
			void this.processQueue();
		});
	}

	private async processQueue() {
		if (this.isMeasuring || this.queue.length === 0) {
			return;
		}

		this.isMeasuring = true;
		this.currentItem = this.queue.shift()!;

		let command = saveCursorPosition;
		command += debugMode ? '\u001B[?25h' : '\u001B[8m'; // Show cursor or make text invisible

		command += `\u001B[${process.stdout.rows};1H`; // Move to last line

		command += this.currentItem.s;
		command += requestCursorPosition;
		if (!debugMode) {
			command += '\u001B[28m'; // Make text visible again
		}

		await new Promise(resolve => {
			process.stdout.write(command, () => {
				resolve(undefined);
			});
		});
	}

	private async _handleReport(reportMatch: RegExpExecArray) {
		const column = Number.parseInt(reportMatch[1], 10);
		let width = column - 1;

		if (debugMode) {
			// Pause so we can see what was rendered and measured

			await new Promise(resolve => {
				setTimeout(resolve, 10);
			});
		}

		// After await, it's possible that the state has changed,
		// although the lock should prevent concurrent modification.
		// A check for currentItem is still a good safeguard.
		if (this.currentItem) {
			if (isAppleTerminal && width > 2) {
				// The apple terminal often reports excessive cursor widths.
				width = 2;
			}

			this.currentItem.resolve(width);
		}

		this.currentItem = undefined;
		this.isMeasuring = false;

		this.buffer = this.buffer.slice(reportMatch.index + reportMatch[0].length);

		let cleanupCommand = `\u001B[${process.stdout.rows};1H`;
		cleanupCommand += ' '.repeat(width);
		cleanupCommand += restoreCursorPosition;

		await new Promise(resolve => {
			process.stdout.write(cleanupCommand, () => {
				resolve(undefined);
			});
		});
		void this.processQueue();
	}

	private async processBuffer() {
		if (this.isProcessingBuffer) {
			return;
		}

		this.isProcessingBuffer = true;

		try {
			while (this.buffer.length > 0) {
				if (!this.isMeasuring || !this.currentItem) {
					break;
				}

				// eslint-disable-next-line no-control-regex
				const reportRegex = /\u001B\[\d+;(\d+)R/;
				const reportMatch = reportRegex.exec(this.buffer);

				if (reportMatch) {
					// eslint-disable-next-line no-await-in-loop
					await this._handleReport(reportMatch);
				} else {
					// No complete report in the buffer, so we wait for more data.
					break;
				}
			}
		} finally {
			this.isProcessingBuffer = false;
		}
	}
}

let measurementEngine: MeasurementEngine;

export const measureText = async (s: string) => {
	measurementEngine ||= new MeasurementEngine();
	return measurementEngine.measure(s);
};

const widthCache = new Map<string, number>();
const measuredWidths = new Map<string, number>();
const toMeasure = new Set<string>();

export const createStringWidth = (rerender: () => void) => {
	const scheduleMeasure = () => {
		setTimeout(async () => {
			const stringsToMeasure = [...toMeasure];
			if (stringsToMeasure.length === 0) {
				return;
			}

			toMeasure.clear();

			const measurementPromises = stringsToMeasure.map(async s => {
				const width = await measureText(s);
				return {s, width};
			});

			try {
				const measuredResults = await Promise.all(measurementPromises);

				for (const {s, width} of measuredResults) {
					log(`Measured width of "${s}" -- ${JSON.stringify(s)}: ${width}`);
					measuredWidths.set(s, width);
				}

				rerender();
			} catch (error: unknown) {
				console.error('Measurement failed:', error);
			}
		}, 100);
	};

	return (s: string) => {
		if (s === ' ') {
			return 1;
		}

		if (s === '') {
			return 0;
		}

		if (measureEverything1) {
			return 1;
		}

		if (widthCache.has(s)) {
			return widthCache.get(s)!;
		}

		if (measuredWidths.has(s)) {
			return measuredWidths.get(s)!;
		}

		const width = defaultStringWidth(s);
		const containsEmoticon =
			/\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(s);
		if (debugSkipMeasurement || !containsEmoticon) {
			widthCache.set(s, width);
			return width;
		}

		if (toMeasure.size === 0) {
			scheduleMeasure();
		}

		toMeasure.add(s);
		return width;
	};
};
