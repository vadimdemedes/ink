/* eslint-disable camelcase */
import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';

export default class Box extends PureComponent {
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
		width: PropTypes.number,
		height: PropTypes.number,
		flexGrow: PropTypes.number,
		flexShrink: PropTypes.number,
		flexDirection: PropTypes.oneOf(['row', 'row-reverse', 'column', 'column-reverse']),
		alignItems: PropTypes.oneOf(['flex-start', 'center', 'flex-end']),
		justifyContent: PropTypes.oneOf(['flex-start', 'center', 'flex-end', 'space-between', 'space-around']),
		unstable__transformChildren: PropTypes.func,
		children: PropTypes.node
	};

	static defaultProps = {
		flexDirection: 'row'
	}

	constructor() {
		super();

		this.nodeRef = React.createRef();
	}

	render() {
		const {children, unstable__transformChildren, ...style} = this.props;

		return (
			<div ref={this.nodeRef} style={style} unstable__transformChildren={unstable__transformChildren}>
				{children}
			</div>
		);
	}

	unstable__getComputedWidth() {
		return this.nodeRef.current.yogaNode.getComputedWidth();
	}
}
