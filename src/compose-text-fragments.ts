import {applyTextStyles, type TextStyleOptions} from './text-styles.js';

export type InlineTextStyle = Pick<
	TextStyleOptions,
	| 'color'
	| 'backgroundColor'
	| 'dimColor'
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

// Compose text fragments into a single styled string for Ink's <Text> component.
// Keeps i18n helpers compatible with the reconciler's nested <Text> constraint.
//
// fragments: strings or fragment objects to compose.
// inheritedBackgroundColor: optional parent background to honor inverse/background styles.
//
// Example:
// const output = composeTextFragments([
//   'Hello ',
//   {text: 'world', styles: [{bold: true, color: 'green'}]},
// ]);
// <Text>{output}</Text>; // wrapper should stay unstyled to avoid stacking.
export function composeTextFragments(
	fragments: TextFragment[],
	inheritedBackgroundColor?: string,
): string {
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
			// If there are styles, apply them
			if (styles.length > 0) {
				for (const style of styles) {
					text = applyTextStyles(text, style, inheritedBackgroundColor);
				}
			} else if (inheritedBackgroundColor) {
				// If no styles but inherited background exists, apply it
				text = applyTextStyles(text, {}, inheritedBackgroundColor);
			}

			return text;
		})
		.join('');
}
