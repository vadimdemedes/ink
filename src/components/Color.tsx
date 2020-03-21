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

const Color: FC<ColorProps & {children: ReactNode}> = ({
	children,
	...colorProps
}) => {
	if (children === '') {
		return null;
	}

	const transformChildren = (children: ReactNode) => {
		Object.keys(colorProps).forEach((method: keyof ColorProps) => {
			if (colorProps[method]) {
				if (methods.includes(method)) {
					children = (chalk[method] as any)(...arrify(colorProps[method]))(children);
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

export default Color;

type Colors =
	| typeof chalk.ForegroundColor
	| typeof chalk.BackgroundColor
	| typeof chalk.Modifiers;

type ChalkFunctions = Except<Except<Chalk, 'Instance' | 'level'>, Colors>;

type ChalkFunctionProps = {
	[K in keyof ChalkFunctions]: Parameters<ChalkFunctions[K]>;
};

type ChalkBooleanProps = Record<Colors, boolean>;

type ColorProps = Partial<ChalkBooleanProps & ChalkFunctionProps>;
