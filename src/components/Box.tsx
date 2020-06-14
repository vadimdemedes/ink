/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
import React, {PureComponent} from 'react';
import type {YogaNode} from 'yoga-layout-prebuilt';
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
 * `<Box>` it's an essential Ink component to build your layout. It's like a `<div style="display: flex">` in a browser.
 */
export default class Box extends PureComponent<Props> {
	static displayName = 'Box';

	static defaultProps = {
		flexDirection: 'row',
		flexGrow: 0,
		flexShrink: 1
	};

	nodeRef = React.createRef<{yogaNode: YogaNode} & HTMLDivElement>();

	render() {
		const {children, ...style} = this.props;

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
			<div ref={this.nodeRef} style={transformedStyle}>
				{children}
			</div>
		);
	}

	unstable__getComputedWidth(): number | undefined {
		return this.nodeRef.current?.yogaNode.getComputedWidth();
	}
}
