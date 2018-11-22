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
		borderTop: PropTypes.number,
		borderRight: PropTypes.number,
		borderBottom: PropTypes.number,
		borderLeft: PropTypes.number,
		border: PropTypes.number,
		borderStyle: PropTypes.string,
		borderColor: PropTypes.string,
		width: PropTypes.number,
		height: PropTypes.number,
		flexGrow: PropTypes.number,
		flexShrink: PropTypes.number,
		flexDirection: PropTypes.oneOf(['row', 'row-reverse', 'column', 'column-reverse']),
		alignItems: PropTypes.oneOf(['flex-start', 'center', 'flex-end']),
		justifyContent: PropTypes.oneOf(['flex-start', 'center', 'flex-end', 'space-between', 'space-around']),
		unstable__transformChildren: PropTypes.func, // eslint-disable-line camelcase
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
		/* eslint-disable camelcase */
		const {children, unstable__transformChildren, ...style} = this.props;

		return (
			<div ref={this.nodeRef} style={style} unstable__transformChildren={unstable__transformChildren}>
				{children}
			</div>
		);
	}

	unstable__getComputedWidth() { // eslint-disable-line camelcase
		return this.nodeRef.current.yogaNode.getComputedWidth();
	}
}
