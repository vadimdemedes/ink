import {applyTextStyles, type TextStyleOptions} from './text-styles.js';

export type InlineTextStyle = Pick<
	TextStyleOptions,
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

			// Apply styles using the same logic as Text component
			for (const style of styles) {
				text = applyTextStyles(text, style);
			}

			return text;
		})
		.join('');
}
