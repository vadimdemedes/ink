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
	({children, ...props}, ref) => {
		const transformedStyle = {
			...props,
			marginLeft: props.marginLeft || props.marginX || props.margin || 0,
			marginRight: props.marginRight || props.marginX || props.margin || 0,
			marginTop: props.marginTop || props.marginY || props.margin || 0,
			marginBottom: props.marginBottom || props.marginY || props.margin || 0,
			paddingLeft: props.paddingLeft || props.paddingX || props.padding || 0,
			paddingRight: props.paddingRight || props.paddingX || props.padding || 0,
			paddingTop: props.paddingTop || props.paddingY || props.padding || 0,
			paddingBottom: props.paddingBottom || props.paddingY || props.padding || 0
		};

		return (
			<ink-box {...props} ref={ref} style={transformedStyle}>
				{children}
			</ink-box>
		);
	}
);

Box.displayName = 'Box';

Box.defaultProps = {
	flexDirection: 'row',
	flexGrow: 0,
	flexShrink: 1
};

export default Box;
