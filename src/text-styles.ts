import chalk from 'chalk';
import colorize from './colorize.js';

/**
Type for text styling options that can be applied to strings.
This is a subset of TextProps focused only on visual styling.
*/
export type TextStyleOptions = {
	readonly color?: string;
	readonly backgroundColor?: string;
	readonly dimColor?: boolean;
	readonly bold?: boolean;
	readonly italic?: boolean;
	readonly underline?: boolean;
	readonly strikethrough?: boolean;
	readonly inverse?: boolean;
};

/**
Apply text styles to a string using the same logic as the Text component.
This function centralizes the text styling logic to ensure consistency
between the Text component and the composeTextFragments function.

@param text - The text to style
@param options - The styling options to apply
@param inheritedBackgroundColor - Background color inherited from parent (for Text component compatibility)
@returns The styled text with ANSI escape codes
*/
export function applyTextStyles(
	text: string,
	options: TextStyleOptions,
	inheritedBackgroundColor?: string,
): string {
	let styledText = text;

	// Apply styles in the same order as Text component transform function
	if (options.dimColor) {
		styledText = chalk.dim(styledText);
	}

	if (options.color) {
		styledText = colorize(styledText, options.color, 'foreground');
	}

	// Use explicit backgroundColor if provided, otherwise use inherited from parent Box
	const effectiveBackgroundColor =
		options.backgroundColor ?? inheritedBackgroundColor;
	if (effectiveBackgroundColor) {
		styledText = colorize(styledText, effectiveBackgroundColor, 'background');
	}

	if (options.bold) {
		styledText = chalk.bold(styledText);
	}

	if (options.italic) {
		styledText = chalk.italic(styledText);
	}

	if (options.underline) {
		styledText = chalk.underline(styledText);
	}

	if (options.strikethrough) {
		styledText = chalk.strikethrough(styledText);
	}

	if (options.inverse) {
		styledText = chalk.inverse(styledText);
	}

	return styledText;
}
