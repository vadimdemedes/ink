import React, {useContext, type ReactNode} from 'react';
import chalk, {type ForegroundColorName} from 'chalk';
import {type LiteralUnion} from 'type-fest';
import colorize from '../colorize.js';
import {type Styles} from '../styles.js';
import {accessibilityContext} from './AccessibilityContext.js';
import {backgroundContext} from './BackgroundContext.js';

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
	This property tells Ink to wrap or truncate text if its width is larger than the container. If `wrap` is passed (the default), Ink will wrap text and split it into multiple lines. If `truncate-*` is passed, Ink will truncate text instead, resulting in one line of text with the rest cut off.
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
	const {isScreenReaderEnabled} = useContext(accessibilityContext);
	const inheritedBackgroundColor = useContext(backgroundContext);
	const childrenOrAriaLabel =
		isScreenReaderEnabled && ariaLabel ? ariaLabel : children;

	if (childrenOrAriaLabel === undefined || childrenOrAriaLabel === null) {
		return null;
	}

	const transform = (children: string): string => {
		if (dimColor) {
			children = chalk.dim(children);
		}

		if (color) {
			children = colorize(children, color, 'foreground');
		}

		// Use explicit backgroundColor if provided, otherwise use inherited from parent Box
		const effectiveBackgroundColor =
			backgroundColor ?? inheritedBackgroundColor;
		if (effectiveBackgroundColor) {
			children = colorize(children, effectiveBackgroundColor, 'background');
		}

		if (bold) {
			children = chalk.bold(children);
		}

		if (italic) {
			children = chalk.italic(children);
		}

		if (underline) {
			children = chalk.underline(children);
		}

		if (strikethrough) {
			children = chalk.strikethrough(children);
		}

		if (inverse) {
			children = chalk.inverse(children);
		}

		return children;
	};

	if (isScreenReaderEnabled && ariaHidden) {
		return null;
	}

	return (
		<ink-text
			style={{flexGrow: 0, flexShrink: 1, flexDirection: 'row', textWrap: wrap}}
			internal_transform={transform}
		>
			{isScreenReaderEnabled && ariaLabel ? ariaLabel : children}
		</ink-text>
	);
}
