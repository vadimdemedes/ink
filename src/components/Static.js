import React, {Component} from 'react';
import PropTypes from 'prop-types';

const childrenToArray = children => Array.isArray(children) ? children : [children];

// This component allows developers to render output before main output from all the other components.
// The reason it's called <Static> is it's append-only output. Output from <Static> components
// is written permanently to stdout and is never updated afterwards. If <Static> component
// receives new children, Ink will detect the changes and write them to stdout.
// In order for this mechanism to work perfectly, <Static> children must never update their output
// once they've been appended to <Static>.
//
// A good example of where this component might be useful is interface like Jest's.
// When running tests, Jest keeps writing completed tests to output, while continuously
// rendering test stats at the end of the output.
export default class Static extends Component {
	static propTypes = {
		children: PropTypes.node
	}

	state = {
		lastIndex: null
	}

	render() {
		const {children, ...otherProps} = this.props;
		const {lastIndex} = this.state;
		let newChildren = children;

		if (typeof lastIndex === 'number') {
			newChildren = childrenToArray(children).slice(lastIndex);
		}

		return (
			<div unstable__static style={otherProps}>
				{newChildren}
			</div>
		);
	}

	componentDidMount() {
		this.saveLastIndex(this.props.children);
	}

	componentDidUpdate(prevProps, prevState) {
		if (prevState.lastIndex === this.state.lastIndex) {
			this.saveLastIndex(this.props.children);
		}
	}

	saveLastIndex(children) {
		const nextIndex = childrenToArray(children).length;

		if (this.state.lastIndex !== nextIndex) {
			this.setState({
				lastIndex: nextIndex
			});
		}
	}
}
