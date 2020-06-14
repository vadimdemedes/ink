import React, {memo} from 'react';
import type {FC, ReactNode} from 'react';
import PropTypes from 'prop-types';
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
	readonly unstable__transformChildren?: (children: string) => string;
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
	children,
	unstable__transformChildren
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

		if (typeof unstable__transformChildren === 'function') {
			children = unstable__transformChildren(children);
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

/* eslint-disable react/boolean-prop-naming */
Text.propTypes = {
	color: PropTypes.string,
	backgroundColor: PropTypes.string,
	dimColor: PropTypes.bool,
	bold: PropTypes.bool,
	italic: PropTypes.bool,
	underline: PropTypes.bool,
	strikethrough: PropTypes.bool,
	wrap: PropTypes.oneOf([
		'wrap',
		'truncate',
		'truncate-start',
		'truncate-middle',
		'truncate-end'
	]),
	children: PropTypes.node.isRequired,
	unstable__transformChildren: PropTypes.func
};
/* eslint-enable react/boolean-prop-naming */

Text.defaultProps = {
	dimColor: false,
	bold: false,
	italic: false,
	underline: false,
	strikethrough: false,
	wrap: 'wrap',
	unstable__transformChildren: undefined
};

export default memo(Text);
