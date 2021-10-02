/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
import React, {forwardRef, PropsWithChildren} from 'react';
import {Except} from 'type-fest';
import {Styles} from '../styles';
import {DOMElement} from '../dom';

export type Props = Except<Styles, 'textWrap'> & {
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

	/**
	 * Padding on all sides. Equivalent to setting `paddingTop`, `paddingBottom`, `paddingLeft` and `paddingRight`.
	 *
	 * @default 0
	 */
	readonly padding?: number;

	/**
	 * Horizontal padding. Equivalent to setting `paddingLeft` and `paddingRight`.
	 *
	 * @default 0
	 */
	readonly paddingX?: number;

	/**
	 * Vertical padding. Equivalent to setting `paddingTop` and `paddingBottom`.
	 *
	 * @default 0
	 */
	readonly paddingY?: number;
};

/**
 * `<Box>` is an essential Ink component to build your layout. It's like `<div style="display: flex">` in the browser.
 */
const Box = forwardRef<DOMElement, PropsWithChildren<Props>>(
	({children, ...style}, ref) => {
		const transformedStyle = {
			...style,
			marginLeft: style.marginLeft || style.marginX || style.margin || 0,
			marginRight: style.marginRight || style.marginX || style.margin || 0,
			marginTop: style.marginTop || style.marginY || style.margin || 0,
			marginBottom: style.marginBottom || style.marginY || style.margin || 0,
			paddingLeft: style.paddingLeft || style.paddingX || style.padding || 0,
			paddingRight: style.paddingRight || style.paddingX || style.padding || 0,
			paddingTop: style.paddingTop || style.paddingY || style.padding || 0,
			paddingBottom: style.paddingBottom || style.paddingY || style.padding || 0
		};

		return (
			<ink-box ref={ref} style={transformedStyle}>
				{children}
			</ink-box>
		);
	}
);

Box.displayName = 'Box';

Box.defaultProps = {
	flexWrap: 'nowrap',
	flexDirection: 'row',
	flexGrow: 0,
	flexShrink: 1
};

export default Box;
