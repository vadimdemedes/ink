import React, {Component, ReactNode} from 'react';
import PropTypes from 'prop-types';
import {Styles} from '../styles';

const childrenToArray = (children: ReactNode) => {
	return Array.isArray(children) ? children : [children];
};

interface StaticState {
	lastIndex: number | null;
}

/**
 * `<Static>` component allows permanently rendering output to stdout and preserving it across renders. Components passed to `<Static>` as children will be written to stdout only once and will never be rerendered. `<Static>` output comes first, before any other output from your components, no matter where it is in the tree. In order for this mechanism to work properly, at most one `<Static>` component must be present in your node tree and components that were rendered must never update their output. Ink will detect new children appended to `<Static>` and render them to stdout.
 *
 * __Note__: `<Static>` accepts only an array of children and each of them must have a unique key.
 *
 * This component allows developers to render output before main output from all the other components.
 * The reason it's called <Static> is it's append-only output. Output from <Static> components
 * is written permanently to stdout and is never updated afterwards. If <Static> component
 * receives new children, Ink will detect the changes and write them to stdout.
 * In order for this mechanism to work perfectly, <Static> children must never update their output
 * once they've been appended to <Static>.
 *
 * A good example of where this component might be useful is interface like Jest's.
 * When running tests, Jest keeps writing completed tests to output, while continuously
 * rendering test stats at the end of the output.
 */
export class Static extends Component<Styles, StaticState> {
	static propTypes = {
		children: PropTypes.node
	};

	state: StaticState = {
		lastIndex: null
	};

	render() {
		const {children, ...otherProps} = this.props;
		const {lastIndex} = this.state;
		let newChildren = children;

		if (typeof lastIndex === 'number') {
			newChildren = childrenToArray(children).slice(lastIndex);
		}

		return (
			<div
				// @ts-ignore
				unstable__static
				style={{
					position: 'absolute',
					flexDirection: 'column',
					...otherProps
				}}
			>
				{newChildren}
			</div>
		);
	}

	componentDidMount() {
		this.saveLastIndex(this.props.children);
	}

	componentDidUpdate(_prevProps: Styles, prevState: StaticState) {
		if (prevState.lastIndex === this.state.lastIndex) {
			this.saveLastIndex(this.props.children);
		}
	}

	saveLastIndex(children: ReactNode) {
		const nextIndex = childrenToArray(children).length;

		if (this.state.lastIndex !== nextIndex) {
			this.setState({
				lastIndex: nextIndex
			});
		}
	}
}
