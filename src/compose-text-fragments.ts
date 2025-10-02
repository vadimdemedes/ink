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

/**
 * Compose text fragments into a single styled string for use with Ink's Text component.
 *
 * This function enables i18n packages to generate pre-styled text that works with
 * Ink's reconciler constraints.
 *
 * @param fragments - Array of text fragments (strings or styled objects)
 * @param inheritedBackgroundColor - Background color inherited from parent context
 * @returns Composed string with ANSI escape codes for styling
 *
 * @example
 * ```tsx
 * // Basic usage
 * const result = composeTextFragments([
 *   "Hello ",
 *   { text: "world", styles: [{ bold: true, color: 'green' }] }
 * ]);
 *
 * // IMPORTANT: Use with unstyled Text wrapper only
 * return <Text>{result}</Text>; // Correct
 *
 * // AVOID: Don't apply additional styles to the wrapper
 * return <Text color="red">{result}</Text>; // Will stack styles on fragments
 * ```
 */
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
