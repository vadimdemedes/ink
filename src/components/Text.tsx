import React from 'react';
import type {FC, ReactNode} from 'react';
import chalk from 'chalk';
import colorize from '../colorize';
import type {Styles} from '../styles';

export interface Props {
	readonly color?: string;
	readonly backgroundColor?: string;
	readonly dimColor?: boolean;
	readonly bold?: boolean;
	readonly italic?: boolean;
	readonly underline?: boolean;
	readonly strikethrough?: boolean;
	readonly wrap?: Styles['textWrap'];
	readonly children: ReactNode;
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
	wrap,
	children
}) => {
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

		return children;
	};

	return (
		<span
			// @ts-ignore
			style={{flexGrow: 0, flexShrink: 1, flexDirection: 'row', textWrap: wrap}}
			// @ts-ignore
			internal_transform={transform}
		>
			{children}
		</span>
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
