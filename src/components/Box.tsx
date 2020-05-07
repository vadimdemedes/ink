import React, {PureComponent, ReactNode} from 'react';
import PropTypes from 'prop-types';
import {YogaNode} from 'yoga-layout-prebuilt';
import {Styles} from '../styles';

export type BoxProps = Styles & {
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

		return (
			<div
				ref={this.nodeRef}
				style={style}
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
