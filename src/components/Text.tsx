import React, {use, type ReactNode} from 'react';
import chalk, {type ForegroundColorName} from 'chalk';
import {type LiteralUnion} from 'type-fest';
import colorize from '../colorize.js';
import {type Styles} from '../styles.js';
import {AccessibilityContext} from './AccessibilityContext.js';
import {BackgroundContext} from './BackgroundContext.js';

export type Props = {
	/**
	A label for the element for screen readers.
	*/
	readonly 'aria-label'?: string;

	/**
	Hide the element from screen readers.
	*/
	readonly 'aria-hidden'?: boolean;

	/**
	Change text color. Ink uses Chalk under the hood, so all its functionality is supported.
	*/
	readonly color?: LiteralUnion<ForegroundColorName, string>;

	/**
	Same as `color`, but for the background.
	*/
	readonly backgroundColor?: LiteralUnion<ForegroundColorName, string>;

	/**
	Dim the color (make it less bright).
	*/
	readonly dimColor?: boolean;

	/**
	Make the text bold.
	*/
	readonly bold?: boolean;

	/**
	Make the text italic.
	*/
	readonly italic?: boolean;

	/**
	Make the text underlined.
	*/
	readonly underline?: boolean;

	/**
	Make the text crossed out with a line.
	*/
	readonly strikethrough?: boolean;

	/**
	Inverse background and foreground colors.
	*/
	readonly inverse?: boolean;

	/**
	This property tells Ink to wrap or truncate text if its width is larger than the container. If `wrap` is passed (the default), Ink will wrap text and split it into multiple lines. If `hard` is passed, Ink will fill each line to the full column width, breaking words as necessary. If `truncate-*` is passed, Ink will truncate text instead, resulting in one line of text with the rest cut off.
	*/
	readonly wrap?: Styles['textWrap'];

	readonly children?: ReactNode;
};

/**
This component can display text and change its style to make it bold, underlined, italic, or strikethrough.
*/
export default function Text({
	color,
	backgroundColor,
	dimColor = false,
	bold = false,
	italic = false,
	underline = false,
	strikethrough = false,
	inverse = false,
	wrap = 'wrap',
	children,
	'aria-label': ariaLabel,
	'aria-hidden': ariaHidden = false,
}: Props) {
	const {isScreenReaderEnabled} = use(AccessibilityContext);
	const inheritedBackgroundColor = use(BackgroundContext);
	// Use explicit backgroundColor if provided, otherwise inherit from the nearest parent Text or Box.
	const effectiveBackgroundColor = backgroundColor ?? inheritedBackgroundColor;
	const childrenOrAriaLabel =
		isScreenReaderEnabled && Boolean(ariaLabel) ? ariaLabel : children;

	if (
		childrenOrAriaLabel === undefined ||
		childrenOrAriaLabel === null ||
		(isScreenReaderEnabled && ariaHidden)
	) {
		return null;
	}

	const transform = (text: string): string => {
		if (dimColor) {
			text = chalk.dim(text);
		}

		// `colorize` returns the text unchanged when the color is unset.
		text = colorize(text, color, 'foreground');
		text = colorize(text, effectiveBackgroundColor, 'background');

		if (bold) {
			text = chalk.bold(text);
		}

		if (italic) {
			text = chalk.italic(text);
		}

		if (underline) {
			text = chalk.underline(text);
		}

		if (strikethrough) {
			text = chalk.strikethrough(text);
		}

		if (inverse) {
			text = chalk.inverse(text);
		}

		return text;
	};

	return (
		<BackgroundContext value={effectiveBackgroundColor}>
			<ink-text
				style={{
					flexGrow: 0,
					flexShrink: 1,
					flexDirection: 'row',
					textWrap: wrap,
				}}
				internal_transform={isScreenReaderEnabled ? undefined : transform}
			>
				{childrenOrAriaLabel}
			</ink-text>
		</BackgroundContext>
	);
}
