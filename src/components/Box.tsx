import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {YogaNode} from 'yoga-layout-prebuilt';

interface BoxProps {
	readonly width?: number | string;
	readonly height?: number | string;
	readonly minWidth?: number;
	readonly minHeight?: number;
	readonly paddingTop?: number;
	readonly paddingBottom?: number;
	readonly paddingLeft?: number;
	readonly paddingRight?: number;
	readonly paddingX?: number;
	readonly paddingY?: number;
	readonly padding?: number;
	readonly marginTop?: number;
	readonly marginBottom?: number;
	readonly marginLeft?: number;
	readonly marginRight?: number;
	readonly marginX?: number;
	readonly marginY?: number;
	readonly margin?: number;
	readonly flexGrow?: number;
	readonly flexShrink?: number;
	readonly flexDirection?: 'row' | 'row-reverse' | 'column' | 'column-reverse';
	readonly flexBasis?: string | number;
	readonly alignItems?: 'flex-start' | 'center' | 'flex-end';
	readonly justifyContent?:
	| 'flex-start'
	| 'center'
	| 'flex-end'
	| 'space-between'
	| 'space-around';
	readonly textWrap?:
	| 'wrap'
	| 'truncate'
	| 'truncate-start'
	| 'truncate-middle'
	| 'truncate-end';
	readonly unstable__transformChildren?: (x: any) => any;
}

export default class Box extends PureComponent<BoxProps> {
	static propTypes = {
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

	nodeRef = React.createRef<{ yogaNode: YogaNode } & HTMLDivElement>();

	render() {
		const {children, unstable__transformChildren, ...style} = this.props;

		return (
			<div
				ref={this.nodeRef}
				style={style}
				// @ts-ignore
				unstable__transformChildren={unstable__transformChildren}
			>
				{children}
			</div>
		);
	}

	unstable__getComputedWidth() {
		return this.nodeRef.current.yogaNode.getComputedWidth();
	}
}
