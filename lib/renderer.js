'use strict';

const {EventEmitter} = require('events');
const renderToString = require('./render-to-string');
const diff = require('./diff');

const noop = () => {};

const build = (nextTree, prevTree, onUpdate = noop, context = {}) => {
	return diff(prevTree, nextTree, onUpdate, context);
};

class Renderer extends EventEmitter {
	constructor(tree) {
		super();

		this.tree = tree;
		this.context = {};
		this.isUnmounted = false;
		this.update = this.update.bind(this);
		this.onUpdate = this.onUpdate.bind(this);
	}

	update() {
		const nextTree = build(this.tree, this.currentTree, this.onUpdate, this.context);

		this.emit('update', renderToString(nextTree));
		this.currentTree = nextTree;
	}

	onUpdate() {
		if (!this.isUnmounted) {
			this.update();
		}
	}

	unmount() {
		if (!this.isUnmounted) {
			this.isUnmounted = true;

			build(null, this.currentTree);
		}
	}
}

module.exports = Renderer;
