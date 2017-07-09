import test from 'ava';
import VNode from '../lib/vnode';
import {h} from '..';

test('return a VNode', t => {
	const node = h('a');

	t.true(node instanceof VNode);
	t.is(node.component, 'a');
	t.deepEqual(node.props, {children: []});
	t.deepEqual(node.children, []);
});

test('preserve raw props', t => {
	const props = {
		a: 'string',
		b: 10,
		func: () => {}
	};

	const node = h('a', props);

	t.deepEqual(node.props, Object.assign({children: []}, props));
});

test('children', t => {
	const node = h('a', null, h('b'), h('c'));

	t.is(node.props.children.length, 2);

	t.is(node.props.children[0].component, 'b');
	t.deepEqual(node.props.children[0].props, {children: []});
	t.deepEqual(node.props.children[0].children, []);

	t.is(node.props.children[1].component, 'c');
	t.deepEqual(node.props.children[1].props, {children: []});
	t.deepEqual(node.props.children[1].children, []);
});

test('children - children given as arg list', t => {
	const node = h('a', null, h('b'), h('c', null, h('d')));

	t.is(node.props.children.length, 2);

	t.is(node.props.children[0].component, 'b');
	t.deepEqual(node.props.children[0].props, {children: []});
	t.deepEqual(node.props.children[0].children, []);

	t.is(node.props.children[1].component, 'c');
	t.deepEqual(node.props.children[1].children, []);
	t.is(node.props.children[1].props.children.length, 1);
	t.is(node.props.children[1].props.children[0].component, 'd');
	t.deepEqual(node.props.children[1].props.children[0].props, {children: []});
	t.deepEqual(node.props.children[1].props.children[0].children, []);
});

test('children - children given as an array', t => {
	const node = h('a', null, [h('b'), h('c', null, h('d'))]);

	t.is(node.props.children.length, 2);

	t.is(node.props.children[0].component, 'b');
	t.deepEqual(node.props.children[0].props, {children: []});
	t.deepEqual(node.props.children[0].children, []);

	t.is(node.props.children[1].component, 'c');
	t.deepEqual(node.props.children[1].children, []);
	t.is(node.props.children[1].props.children.length, 1);
	t.is(node.props.children[1].props.children[0].component, 'd');
	t.deepEqual(node.props.children[1].props.children[0].props, {children: []});
	t.deepEqual(node.props.children[1].props.children[0].children, []);
});

test('children - flatten one layer as needed', t => {
	const node = h('a', null, h('b'), [h('c', null, h('d'))]);

	t.is(node.props.children.length, 2);

	t.is(node.props.children[0].component, 'b');
	t.deepEqual(node.props.children[0].props, {children: []});
	t.deepEqual(node.props.children[0].children, []);

	t.is(node.props.children[1].component, 'c');
	t.deepEqual(node.props.children[1].children, []);
	t.is(node.props.children[1].props.children.length, 1);
	t.is(node.props.children[1].props.children[0].component, 'd');
	t.deepEqual(node.props.children[1].props.children[0].props, {children: []});
	t.deepEqual(node.props.children[1].props.children[0].children, []);
});

test('nested children', t => {
	let node = h('a', null, h('b'), [h('c'), h('d'), h('e')]);
	t.deepEqual(node.props.children.map(child => child.component), ['b', 'c', 'd', 'e']);

	node = h('a', null, [h('b'), [h('c'), h('d'), h('e')]]);
	t.deepEqual(node.props.children.map(child => child.component), ['b', 'c', 'd', 'e']);

	node = h('a', {children: [h('b'), [h('c'), h('d'), h('e')]]});
	t.deepEqual(node.props.children.map(child => child.component), ['b', 'c', 'd', 'e']);

	node = h('a', {children: [[h('b'), [h('c'), h('d'), h('e')]]]});
	t.deepEqual(node.props.children.map(child => child.component), ['b', 'c', 'd', 'e']);
});

test('text children', t => {
	const node = h('a', null, 'helloworld');

	t.deepEqual(node.props.children, ['helloworld']);
});

test('merge adjacent text children', t => {
	const node = h('a', null, [
		'one',
		'two',
		h('b'),
		'three',
		h('c'),
		h('d'),
		'four',
		null,
		'five',
		'six'
	]);

	t.is(node.props.children.length, 6);
	t.is(node.props.children[0], 'onetwo');
	t.is(node.props.children[1].component, 'b');
	t.is(node.props.children[2], 'three');
	t.is(node.props.children[3].component, 'c');
	t.is(node.props.children[4].component, 'd');
	t.is(node.props.children[5], 'fourfivesix');
});

test('merge nested adjacent text children', t => {
	const node = h('a', null, [
		'one',
		['two', null, 'three'],
		null,
		['four', null, 'five', null],
		'six',
		null
	]);

	t.deepEqual(node.props.children, ['onetwothreefourfivesix']);
});

test('don\'t merge children that are boolean', t => {
	const node = h('a', null, [
		null,
		'one',
		true,
		'two',
		false,
		'three'
	]);

	t.deepEqual(node.props.children, ['onetwothree']);
});

test.failing('don\'t merge children of components', t => {
	const Component = ({children}) => children;
	const node = h(Component, null, 'x', 'y');

	t.deepEqual(node.props.children, ['x', 'y']);
});

test('throws on missing component', t => {
	t.throws(() => h(undefined), 'Expected component to be a function, but received undefined. You may have forgotten to export a component.');
});

