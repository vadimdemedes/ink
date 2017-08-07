'use strict';

const {enqueueUpdate} = require('./render-queue');

class Component {
	constructor(props, context) {
		this.props = props;
		this.context = context;
		this.state = {};
		this._onUpdate = null;
		this._pendingState = null;
		this._stateUpdateCallbacks = [];
	}

	setState(nextState, callback) {
		if (typeof nextState === 'function') {
			nextState = nextState(this.state, this.props);
		}

		this._pendingState = Object.assign({}, this._pendingState || this.state, nextState);

		if (typeof callback === 'function') {
			this._stateUpdateCallbacks.push(callback);
		}

		this._enqueueUpdate();
	}

	forceUpdate() {
		this._enqueueUpdate();
	}

	componentWillMount() {}
	componentDidMount() {}
	componentWillUnmount() {}
	componentDidUnmount() {}
	componentWillReceiveProps() {}
	componentWillUpdate() {}
	componentDidUpdate() {}

	shouldComponentUpdate() {
		return true;
	}

	getChildContext() {
		return {};
	}

	render() {
		return null;
	}

	_render() {
		return this.render(this.props, this.state, this.context);
	}

	_enqueueUpdate() {
		enqueueUpdate(this._onUpdate);
	}
}

Component.isComponent = true;

module.exports = Component;
