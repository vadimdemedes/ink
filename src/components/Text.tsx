import React, {FC, ReactNode} from 'react';
import chalk, {ForegroundColor} from 'chalk';
import colorize from '../colorize';
import {Styles} from '../styles';
import {LiteralUnion} from 'type-fest';

export interface Props {
	/**
	 * Change text color. Ink uses chalk under the hood, so all its functionality is supported.
	 */
	readonly color?: LiteralUnion<typeof ForegroundColor, string>;

	/**
	 * Same as `color`, but for background.
	 */
	readonly backgroundColor?: LiteralUnion<typeof ForegroundColor, string>;

	/**
	 * Dim the color (emit a small amount of light).
	 */
	readonly dimColor?: boolean;

	/**
	 * Make the text bold.
	 */
	readonly bold?: boolean;

	/**
	 * Make the text italic.
	 */
	readonly italic?: boolean;

	/**
	 * Make the text underlined.
	 */
	readonly underline?: boolean;

	/**
	 * Make the text crossed with a line.
	 */
	readonly strikethrough?: boolean;

	/**
	 * Inverse background and foreground colors.
	 */
	readonly inverse?: boolean;

	/**
	 * This property tells Ink to wrap or truncate text if its width is larger than container.
	 * If `wrap` is passed (by default), Ink will wrap text and split it into multiple lines.
	 * If `truncate-*` is passed, Ink will truncate text instead, which will result in one line of text with the rest cut off.
	 */
	readonly wrap?: Styles['textWrap'];
	readonly children?: ReactNode;
}

/**
 * This component can display text, and change its style to make it colorful, bold, underline, italic or strikethrough.
 */
const Text: FC<Props> = ({
	color,
	backgroundColor,
	dimColor,
	bold,
	italic,
	underline,
	strikethrough,
	inverse,
	wrap,
	children
}) => {
	if (children === undefined || children === null) {
		return null;
	}

	const transform = (children: string): string => {
		if (dimColor) {
			children = chalk.dim(children);
		}

		if (color) {
			children = colorize(children, color, 'foreground');
		}

		if (backgroundColor) {
			children = colorize(children, backgroundColor, 'background');
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

	return (
		<ink-text
			style={{flexGrow: 0, flexShrink: 1, flexDirection: 'row', textWrap: wrap}}
			internal_transform={transform}
		>
			{children}
		</ink-text>
	);
};

Text.displayName = 'Text';

Text.defaultProps = {
	dimColor: false,
	bold: false,
	italic: false,
	underline: false,
	strikethrough: false,
	wrap: 'wrap'
};

export default Text;
