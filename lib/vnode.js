'use strict';

const flatten = require('lodash.flattendeep');
const arrify = require('arrify');
const Div = require('./components/div');
const Span = require('./components/span');
const Br = require('./components/br');
const isClassComponent = require('./is-class-component');
const transformProps = require('./transform-props');

const getComponent = name => {
	switch (name) {
		case 'div': return Div;
		case 'span': return Span;
		case 'br': return Br;
		default: return null;
	}
};

class VNode {
	constructor(component, props = {}) {
		const ref = props.ref;
		delete props.ref;

		this.component = typeof component === 'string' ? getComponent(component) : component;
		this._props = transformProps(props);
		this._children = [];
		this.ref = ref;
		this.instance = null;
	}

	get props() {
		return this._props;
	}

	set props(nextProps) {
		this._props = transformProps(nextProps);
		return this._props;
	}

	get children() {
		return this._children;
	}

	set children(nextChildren) {
		this._children = flatten(arrify(nextChildren));
		return this._children;
	}

	createInstance(props) {
		if (isClassComponent(this.component)) {
			this.instance = new this.component(props, {}); // eslint-disable-line new-cap
		}
	}
}

if (process.env.NODE_ENV !== 'production') {
	VNode.prototype.$$typeof = Symbol.for('react.element');
}

module.exports = VNode;
