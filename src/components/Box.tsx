/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
import React from 'react';
import type {FC} from 'react';
import type {Except} from 'type-fest';
import type {Styles} from '../styles';

export type Props = Except<Styles, 'textWrap'> & {
	margin?: number;
	marginX?: number;
	marginY?: number;
	padding?: number;
	paddingX?: number;
	paddingY?: number;
};

/**
 * `<Box>` is an essential Ink component to build your layout. It's like `<div style="display: flex">` in the browser.
 */
const Box: FC<Props> = ({children, ...style}) => {
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

	return <ink-box style={transformedStyle}>{children}</ink-box>;
};

Box.displayName = 'Box';

Box.defaultProps = {
	flexDirection: 'row',
	flexGrow: 0,
	flexShrink: 1
};

export default Box;
