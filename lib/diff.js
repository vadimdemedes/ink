'use strict';

const PropTypes = require('prop-types');
const isEqualShallow = require('is-equal-shallow');
const VNode = require('./vnode');

const isClassComponent = component => component.isComponent;

const checkPropTypes = (component, props) => {
	if (process.env.NODE_ENV !== 'production' && typeof component.propTypes === 'object') {
		const name = component.displayName || component.name;

		PropTypes.checkPropTypes(component.propTypes, props, 'prop', name);
	}
};

const getProps = vnode => Object.assign({}, vnode.component.defaultProps, vnode.props);

const getNextState = vnode => {
	if (isClassComponent(vnode.component)) {
		return vnode.instance._pendingState || vnode.instance.state;
	}

	return null;
};

const mount = (vnode, context, onUpdate) => {
	const props = getProps(vnode);
	checkPropTypes(vnode.component, props);

	if (isClassComponent(vnode.component)) {
		vnode.createInstance(props);
		vnode.instance._onUpdate = onUpdate;
		vnode.instance.context = Object.assign(context, vnode.instance.getChildContext());
		vnode.instance.componentWillMount();
		vnode.children = vnode.instance._render();
	} else {
		vnode.children = vnode.component(props, context);
	}
};

const componentDidMount = vnode => {
	if (isClassComponent(vnode.component)) {
		vnode.instance.componentDidMount();

		if (vnode.ref) {
			vnode.ref(vnode.instance);
		}
	}
};

const shouldComponentUpdate = (vnode, nextProps, nextState) => {
	if (isClassComponent(vnode.component)) {
		return vnode.instance.shouldComponentUpdate(nextProps, nextState);
	}

	return !isEqualShallow(vnode.props, nextProps);
};

const componentWillReceiveProps = (vnode, nextProps) => {
	vnode.props = nextProps;

	if (isClassComponent(vnode.component)) {
		vnode.instance.componentWillReceiveProps(nextProps);
	}
};

const rerender = (vnode, context) => {
	const nextProps = getProps(vnode);
	checkPropTypes(vnode.component, nextProps);

	if (isClassComponent(vnode.component)) {
		vnode.instance._componentWillUpdate(nextProps, getNextState(vnode));
		vnode.children = vnode.instance._render();
		return;
	}

	vnode.children = vnode.component(nextProps, context);
};

const componentDidUpdate = vnode => {
	if (isClassComponent(vnode.component)) {
		vnode.instance._componentDidUpdate();
	}
};

const componentWillUnmount = vnode => {
	if (isClassComponent(vnode.component)) {
		vnode.instance.componentWillUnmount();
	}
};

const unmount = vnode => {
	if (isClassComponent(vnode.component)) {
		componentWillUnmount(vnode);
		vnode.instance = null;
	}

	vnode.children.forEach(childVNode => {
		diff(childVNode, null); // eslint-disable-line no-use-before-define
	});

	if (isClassComponent(vnode.component) && vnode.ref) {
		vnode.ref(null);
	}
};

const diff = (prevNode, nextNode, onUpdate, context) => {
	if (typeof nextNode === 'number') {
		if (prevNode instanceof VNode) {
			unmount(prevNode);
		}

		return String(nextNode);
	}

	if (!nextNode || typeof nextNode === 'boolean') {
		if (prevNode instanceof VNode) {
			unmount(prevNode);
		}

		return null;
	}

	if (typeof nextNode === 'string') {
		if (prevNode instanceof VNode) {
			unmount(prevNode);
		}

		return nextNode;
	}

	let isUpdate = true;

	if (!(prevNode instanceof VNode)) {
		mount(nextNode, context, onUpdate);
		isUpdate = false;
	}

	if (isUpdate && prevNode.component !== nextNode.component) {
		unmount(prevNode);
		mount(nextNode, context, onUpdate);
		isUpdate = false;
	}

	const shouldUpdate = isUpdate && shouldComponentUpdate(prevNode, getProps(nextNode), getNextState(prevNode));
	const prevChildren = isUpdate ? [].slice.call(prevNode.children) : [];

	if (isUpdate && !isEqualShallow(getProps(prevNode), getProps(nextNode))) {
		componentWillReceiveProps(prevNode, getProps(nextNode));
	}

	if (shouldUpdate) {
		rerender(prevNode, context);
	}

	const nextChildren = isUpdate ? prevNode.children : nextNode.children;

	const length = Math.max(prevChildren.length, nextChildren.length);
	const reconciledChildren = [];

	for (let index = 0; index < length; index++) {
		const childNode = diff(prevChildren[index], nextChildren[index], onUpdate, context);
		reconciledChildren.push(childNode);
	}

	if (isUpdate) {
		prevNode.children = reconciledChildren;

		if (shouldUpdate) {
			componentDidUpdate(prevNode);
		}
	} else {
		nextNode.children = reconciledChildren;
		componentDidMount(nextNode);
	}

	return isUpdate ? prevNode : nextNode;
};

module.exports = diff;
