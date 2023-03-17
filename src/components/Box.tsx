/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
import React, {forwardRef, type PropsWithChildren} from 'react';
import {type Except} from 'type-fest';
import {type Styles} from '../styles.js';
import {type DOMElement} from '../dom.js';

export type Props = Except<Styles, 'textWrap'> & {
	/**
	 * Size of the gap between an element's columns.
	 *
	 * @default 0
	 */
	readonly columnGap?: number;

	/**
	 * Size of the gap between element's rows.
	 *
	 * @default 0
	 */
	readonly rowGap?: number;

	/**
	 * Size of the gap between an element's columns and rows. Shorthand for `columnGap` and `rowGap`.
	 *
	 * @default 0
	 */
	readonly gap?: number;

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

	/**
	 * Behavior for an element's overflow in both directions.
	 *
	 * @default 'visible'
	 */
	readonly overflow?: 'visible' | 'hidden';

	/**
	 * Behavior for an element's overflow in horizontal direction.
	 *
	 * @default 'visible'
	 */
	readonly overflowX?: 'visible' | 'hidden';

	/**
	 * Behavior for an element's overflow in vertical direction.
	 *
	 * @default 'visible'
	 */
	readonly overflowY?: 'visible' | 'hidden';
};

/**
 * `<Box>` is an essential Ink component to build your layout. It's like `<div style="display: flex">` in the browser.
 */
const Box = forwardRef<DOMElement, PropsWithChildren<Props>>(
	({children, ...style}, ref) => {
		const transformedStyle = {
			...style,
			columnGap: style.columnGap || style.gap || 0,
			rowGap: style.rowGap || style.gap || 0,
			marginLeft: style.marginLeft || style.marginX || style.margin || 0,
			marginRight: style.marginRight || style.marginX || style.margin || 0,
			marginTop: style.marginTop || style.marginY || style.margin || 0,
			marginBottom: style.marginBottom || style.marginY || style.margin || 0,
			paddingLeft: style.paddingLeft || style.paddingX || style.padding || 0,
			paddingRight: style.paddingRight || style.paddingX || style.padding || 0,
			paddingTop: style.paddingTop || style.paddingY || style.padding || 0,
			paddingBottom:
				style.paddingBottom || style.paddingY || style.padding || 0,
			overflowX: style.overflowX || style.overflow || 'visible',
			overflowY: style.overflowY || style.overflow || 'visible'
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
