import React, {memo} from 'react';
import type {FC, ReactNode} from 'react';
import PropTypes from 'prop-types';
import arrify from 'arrify';
import chalk from 'chalk';
import type {Chalk} from 'chalk';
import type {Except} from 'type-fest';
import Transform from './Transform';

type Colors =
	| typeof chalk.ForegroundColor
	| typeof chalk.BackgroundColor
	| typeof chalk.Modifiers;

type ChalkFunctions = Except<Except<Chalk, 'Instance' | 'level'>, Colors>;

type ChalkFunctionProps = {
	[K in keyof ChalkFunctions]: Parameters<ChalkFunctions[K]> extends [string]
		? string
		: Parameters<ChalkFunctions[K]>;
};

type ChalkBooleanProps = Record<Colors, boolean>;

type ChalkProps = Partial<ChalkBooleanProps & ChalkFunctionProps>;

export type Props = ChalkProps & {children: ReactNode};

const methods = [
	'hex',
	'hsl',
	'hsv',
	'hwb',
	'rgb',
	'keyword',
	'bgHex',
	'bgHsl',
	'bgHsv',
	'bgHwb',
	'bgRgb',
	'bgKeyword',
	'ansi',
	'ansi256',
	'bgAnsi',
	'bgAnsi256'
];

/**
 * The `<Color>` compoment is a simple wrapper around the `chalk` API. It supports all of the `chalk`'s methods as `props`.
 */
const Color: FC<Props> = ({children, ...colorProps}) => {
	if (children === '') {
		return null;
	}

	const transform = (children: ReactNode) => {
		// @ts-ignore
		Object.keys(colorProps).forEach((method: keyof ChalkProps) => {
			if (colorProps[method]) {
				if (methods.includes(method)) {
					children = (chalk[method] as any)(...arrify(colorProps[method]))(
						children
					);
				} else if (typeof chalk[method] === 'function') {
					children = (chalk[method] as any)(children);
				}
			}
		});

		return children;
	};

	return <Transform transform={transform}>{children}</Transform>;
};

Color.displayName = 'Color';

Color.propTypes = {
	children: PropTypes.node
};

Color.defaultProps = {
	children: ''
};

export default memo(Color);
