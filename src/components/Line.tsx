/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable react/no-unused-prop-types */
import React, {forwardRef} from 'react';
import {type Styles} from '../styles.js';
import {type DOMElement} from '../dom.js';

export type Props = Pick<
	Styles,
	| 'position'
	| 'marginTop'
	| 'marginBottom'
	| 'marginLeft'
	| 'marginRight'
	| 'borderStyle'
	| 'borderColor'
	| 'height'
	| 'width'
> & {
	orientation?: 'horizontal' | 'vertical';

	/**
	 * Margin on all sides. Equivalent to setting `marginTop`, `marginBottom`, `marginLeft` and `marginRight`.
	 *
	 * @default 0
	 */
	readonly margin?: number;

	/**
	 * Horizontal margin. Equivalent to setting `marginLeft` and `marginRight`.
	 *
	 * @default 0
	 */
	readonly marginX?: number;

	/**
	 * Vertical margin. Equivalent to setting `marginTop` and `marginBottom`.
	 *
	 * @default 0
	 */
	readonly marginY?: number;
};

/**
 * Line renders a horizontal or vertical line with the given border style and color.
 */
const Line = forwardRef<DOMElement, Props>(({orientation, ...style}, ref) => {
	const transformedStyle = {
		...style,
		marginLeft: style.marginLeft || style.marginX || style.margin || 0,
		marginRight: style.marginRight || style.marginX || style.margin || 0,
		marginTop: style.marginTop || style.marginY || style.margin || 0,
		marginBottom: style.marginBottom || style.marginY || style.margin || 0,
		width: orientation === 'horizontal' ? style.width : 1,
		height: orientation === 'vertical' ? style.height : 1
	};

	return (
		<ink-line ref={ref} orientation={orientation} style={transformedStyle} />
	);
});

Line.displayName = 'Line';

Line.defaultProps = {
	orientation: 'horizontal'
};

export default Line;
