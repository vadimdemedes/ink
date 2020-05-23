/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
import React, {PureComponent, ReactNode} from 'react';
import PropTypes from 'prop-types';
import {YogaNode} from 'yoga-layout-prebuilt';
import {Styles} from '../styles';

export type BoxProps = Styles & {
	margin?: number;
	marginX?: number;
	marginY?: number;
	padding?: number;
	paddingX?: number;
	paddingY?: number;
	unstable__transformChildren?: (children: ReactNode) => ReactNode;
};

/**
 * `<Box>` it's an essential Ink component to build your layout. It's like a `<div style="display: flex">` in a browser.
 */
export class Box extends PureComponent<BoxProps> {
	static displayName = 'Box';
	static propTypes = {
		display: PropTypes.oneOf(['flex', 'none']),
		margin: PropTypes.number,
		marginX: PropTypes.number,
		marginY: PropTypes.number,
		marginTop: PropTypes.number,
		marginBottom: PropTypes.number,
		marginLeft: PropTypes.number,
		marginRight: PropTypes.number,
		padding: PropTypes.number,
		paddingX: PropTypes.number,
		paddingY: PropTypes.number,
		paddingTop: PropTypes.number,
		paddingBottom: PropTypes.number,
		paddingLeft: PropTypes.number,
		paddingRight: PropTypes.number,
		width: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
		minWidth: PropTypes.number,
		height: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
		minHeight: PropTypes.number,
		flexGrow: PropTypes.number,
		flexShrink: PropTypes.number,
		flexDirection: PropTypes.oneOf([
			'row',
			'row-reverse',
			'column',
			'column-reverse'
		]),
		flexBasis: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
		alignItems: PropTypes.oneOf([
			'stretch',
			'flex-start',
			'center',
			'flex-end'
		]),
		justifyContent: PropTypes.oneOf([
			'flex-start',
			'center',
			'flex-end',
			'space-between',
			'space-around'
		]),
		textWrap: PropTypes.oneOf([
			'wrap',
			'truncate',
			'truncate-start',
			'truncate-middle',
			'truncate-end'
		]),
		unstable__transformChildren: PropTypes.func,
		children: PropTypes.node
	};

	static defaultProps = {
		flexDirection: 'row',
		flexGrow: 0,
		flexShrink: 1
	};

	nodeRef = React.createRef<{yogaNode: YogaNode} & HTMLDivElement>();

	render() {
		const {children, unstable__transformChildren, ...style} = this.props;

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
			<div
				ref={this.nodeRef}
				style={transformedStyle}
				// @ts-ignore
				internal_transform={unstable__transformChildren}
			>
				{children}
			</div>
		);
	}

	unstable__getComputedWidth(): number | undefined {
		return this.nodeRef.current?.yogaNode.getComputedWidth();
	}
}
