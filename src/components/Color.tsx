import React, {FC, ReactNode} from 'react';
import PropTypes from 'prop-types';
import arrify from 'arrify';
import chalk from 'chalk';

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
	'bgKeyword'
];

const Color: FC<ColorProps & { children: ReactNode }> = ({children, ...colorProps}) => {
	if (children === '') {
		return null;
	}

	// TODO: Figure out what's going on here and write the type definition
	const transformChildren = (children: ReactNode) => {
		Object.keys(colorProps).forEach(method => {
			// @ts-ignore
			if (colorProps[method]) {
				if (methods.includes(method)) {
					// @ts-ignore
					children = chalk[method](...arrify(colorProps[method]))(children);
					// @ts-ignore
				} else if (typeof chalk[method] === 'function') {
					// @ts-ignore
					children = chalk[method](children);
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

interface ColorProps {
	readonly hex?: string;
	readonly hsl?: [number, number, number];
	readonly hsv?: [number, number, number];
	readonly hwb?: [number, number, number];
	readonly rgb?: [number, number, number];
	readonly keyword?: string;
	readonly bgHex?: string;
	readonly bgHsl?: [number, number, number];
	readonly bgHsv?: [number, number, number];
	readonly bgHwb?: [number, number, number];
	readonly bgRgb?: [number, number, number];
	readonly bgKeyword?: string;

	readonly reset?: boolean;
	readonly bold?: boolean;
	readonly dim?: boolean;
	readonly italic?: boolean;
	readonly underline?: boolean;
	readonly inverse?: boolean;
	readonly hidden?: boolean;
	readonly strikethrough?: boolean;

	readonly visible?: boolean;

	readonly black?: boolean;
	readonly red?: boolean;
	readonly green?: boolean;
	readonly yellow?: boolean;
	readonly blue?: boolean;
	readonly magenta?: boolean;
	readonly cyan?: boolean;
	readonly white?: boolean;
	readonly gray?: boolean;
	readonly grey?: boolean;
	readonly blackBright?: boolean;
	readonly redBright?: boolean;
	readonly greenBright?: boolean;
	readonly yellowBright?: boolean;
	readonly blueBright?: boolean;
	readonly magentaBright?: boolean;
	readonly cyanBright?: boolean;
	readonly whiteBright?: boolean;

	readonly bgBlack?: boolean;
	readonly bgRed?: boolean;
	readonly bgGreen?: boolean;
	readonly bgYellow?: boolean;
	readonly bgBlue?: boolean;
	readonly bgMagenta?: boolean;
	readonly bgCyan?: boolean;
	readonly bgWhite?: boolean;
	readonly bgBlackBright?: boolean;
	readonly bgRedBright?: boolean;
	readonly bgGreenBright?: boolean;
	readonly bgYellowBright?: boolean;
	readonly bgBlueBright?: boolean;
	readonly bgMagentaBright?: boolean;
	readonly bgCyanBright?: boolean;
	readonly bgWhiteBright?: boolean;
}
