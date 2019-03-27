import React, {Component} from 'react';
import PropTypes from 'prop-types';

// This component allows developers to render output before main output from all the other components.
// The reason it's called <Static> is it's append-only output. Output from <Static> components
// is written permantently to stdout and is never updated afterwards. If <Static> component
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

	constructor() {
		super();

		this.state = {
			ignoreKeys: []
		};
	}

	render() {
		const {children, ...otherProps} = this.props;

		const newChildren = React.Children.toArray(children).filter(child => {
			return !this.state.ignoreKeys.includes(child.key);
		});

		return (
			<div unstable__static style={otherProps}>
				{newChildren}
			</div>
		);
	}

	componentDidMount() {
		this.saveRenderedKeys();
	}

	componentDidUpdate(prevProps, prevState) {
		if (prevState.ignoreKeys === this.state.ignoreKeys) {
			this.saveRenderedKeys();
		}
	}

	saveRenderedKeys() {
		this.setState(prevState => {
			const newKeys = React.Children
				.toArray(this.props.children)
				.map(child => child.key)
				.filter(key => !prevState.ignoreKeys.includes(key));

			return {
				ignoreKeys: [
					...prevState.ignoreKeys,
					...newKeys
				]
			};
		});
	}
}
