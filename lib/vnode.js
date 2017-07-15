'use strict';

const transformProps = require('./transform-props');

class VNode {
	constructor(component, props = {}) {
		const ref = props.ref;
		delete props.ref;

		this.component = component;
		this.props = transformProps(props);
		this.children = [];
		this.ref = ref;
	}
}

if (process.env.NODE_ENV !== 'production') {
	VNode.prototype.$$typeof = Symbol.for('react.element');
}

module.exports = VNode;
