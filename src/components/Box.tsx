import React, {forwardRef, type PropsWithChildren} from 'react';
import {type Except} from 'type-fest';
import {type Styles} from '../styles.js';
import {type DOMElement} from '../dom.js';

export type Props = Except<Styles, 'textWrap'>;

/**
 * `<Box>` is an essential Ink component to build your layout. It's like `<div style="display: flex">` in the browser.
 */
const Box = forwardRef<DOMElement, PropsWithChildren<Props>>(
	({children, ...style}, ref) => {
		return (
			<ink-box
				ref={ref}
				style={{
					...style,
					overflowX: style.overflowX ?? style.overflow ?? 'visible',
					overflowY: style.overflowY ?? style.overflow ?? 'visible',
				}}
			>
				{children}
			</ink-box>
		);
	},
);

Box.displayName = 'Box';

Box.defaultProps = {
	flexWrap: 'nowrap',
	flexDirection: 'row',
	flexGrow: 0,
	flexShrink: 1,
};

export default Box;
