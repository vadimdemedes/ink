import chalk from 'chalk';
import colorize from './colorize.js';
import {type Props as TextProps} from './components/Text.js';

export type InlineTextStyle = Pick<
	TextProps,
	| 'color'
	| 'backgroundColor'
	| 'bold'
	| 'italic'
	| 'underline'
	| 'strikethrough'
	| 'inverse'
>;

export type TextFragment =
	| string
	| {
			readonly text: string;
			readonly styles?: readonly InlineTextStyle[];
			readonly transform?: (text: string, index: number) => string;
	  };

export function composeTextFragments(fragments: TextFragment[]): string {
	if (!Array.isArray(fragments)) {
		throw new TypeError('Expected an array of fragments');
	}

	return fragments
		.map((fragment, index) => {
			if (typeof fragment === 'string') {
				return fragment;
			}

			if (typeof fragment !== 'object' || fragment === null) {
				throw new TypeError(
					`Fragment at index ${index} must be a string or object`,
				);
			}

			let {text} = fragment;
			const {styles = [], transform} = fragment;

			if (typeof text !== 'string') {
				throw new TypeError(
					`Fragment at index ${index} must have a string 'text' property`,
				);
			}

			// Apply transform function first if provided
			if (transform) {
				if (typeof transform !== 'function') {
					throw new TypeError(`Transform at index ${index} must be a function`);
				}

				text = transform(text, index);
			}

			// Apply styles in the same order as the Text component
			// Each style object is applied in sequence to match Text component behavior
			for (const style of styles) {
				// Apply in the same order as Text component transform function
				if (style.color) {
					text = colorize(text, style.color, 'foreground');
				}

				if (style.backgroundColor) {
					text = colorize(text, style.backgroundColor, 'background');
				}

				if (style.bold) {
					text = chalk.bold(text);
				}

				if (style.italic) {
					text = chalk.italic(text);
				}

				if (style.underline) {
					text = chalk.underline(text);
				}

				if (style.strikethrough) {
					text = chalk.strikethrough(text);
				}

				if (style.inverse) {
					text = chalk.inverse(text);
				}
			}

			return text;
		})
		.join('');
}
