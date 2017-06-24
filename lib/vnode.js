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

module.exports = VNode;
