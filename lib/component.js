'use strict';

const {enqueueUpdate} = require('./render-queue');

class Component {
	constructor(props, context) {
		this.props = props;
		this.context = context;
		this.state = {};
		this._onUpdate = null;
		this._pendingState = null;
	}

	setState(nextState) {
		if (typeof nextState === 'function') {
			nextState = nextState(this.state);
		}

		this._pendingState = Object.assign({}, this.state, nextState);
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

module.exports = Component;
