import React, {FC, ReactNode} from 'react';
import PropTypes from 'prop-types';
import arrify from 'arrify';
import chalk, {Chalk} from 'chalk';
import {Except} from 'type-fest';

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
export const Color: FC<ColorProps> = ({children, ...colorProps}) => {
	if (children === '') {
		return null;
	}

	const transformChildren = (children: ReactNode) => {
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

	return (
		<span
			style={{flexDirection: 'row'}}
			// @ts-ignore
			unstable__transformChildren={transformChildren}
		>
			{children}
		</span>
	);
};

Color.propTypes = {
	children: PropTypes.node
};

Color.defaultProps = {
	children: ''
};

type Colors =
	| typeof chalk.ForegroundColor
	| typeof chalk.BackgroundColor
	| typeof chalk.Modifiers;

type ChalkFunctions = Except<Except<Chalk, 'Instance' | 'level'>, Colors>;

type ChalkFunctionProps = {
	[K in keyof ChalkFunctions]: Parameters<ChalkFunctions[K]> extends [string] ? string : Parameters<ChalkFunctions[K]>;
};

type ChalkBooleanProps = Record<Colors, boolean>;

type ChalkProps = Partial<ChalkBooleanProps & ChalkFunctionProps>;

export type ColorProps = ChalkProps & { children: ReactNode };
