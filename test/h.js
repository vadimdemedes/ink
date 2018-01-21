import test from 'ava';
import Span from '../lib/components/span';
import Div from '../lib/components/div';
import VNode from '../lib/vnode';
import {h} from '..';

test('throws on missing component', t => {
	t.throws(() => h(), 'Expected component to be a function, but received undefined. You may have forgotten to export a component.');
});

test('return a VNode', t => {
	const node = h('span');

	t.true(node instanceof VNode);
	t.is(node.component, Span);
	t.deepEqual(node.props, {children: []});
	t.deepEqual(node.children, []);
});

test('preserve raw props', t => {
	const props = {
		a: 'string',
		b: 10,
		func: () => {}
	};

	const node = h('span', props);

	t.deepEqual(node.props, Object.assign({children: []}, props));
});

test('children', t => {
	const node = h('div', null, h('span'), h('div'));

	t.is(node.props.children.length, 2);

	t.is(node.props.children[0].component, Span);
	t.deepEqual(node.props.children[0].props, {children: []});
	t.deepEqual(node.props.children[0].children, []);

	t.is(node.props.children[1].component, Div);
	t.deepEqual(node.props.children[1].props, {children: []});
	t.deepEqual(node.props.children[1].children, []);
});

test('children - children given as arg list', t => {
	const node = h('div', null, h('span'), h('div', null, h('span')));

	t.is(node.props.children.length, 2);

	t.is(node.props.children[0].component, Span);
	t.deepEqual(node.props.children[0].props, {children: []});
	t.deepEqual(node.props.children[0].children, []);

	t.is(node.props.children[1].component, Div);
	t.deepEqual(node.props.children[1].children, []);
	t.is(node.props.children[1].props.children.length, 1);
	t.is(node.props.children[1].props.children[0].component, Span);
	t.deepEqual(node.props.children[1].props.children[0].props, {children: []});
	t.deepEqual(node.props.children[1].props.children[0].children, []);
});

test('children - children given as an array', t => {
	const node = h('div', null, [h('span'), h('div', null, h('span'))]);

	t.is(node.props.children.length, 2);

	t.is(node.props.children[0].component, Span);
	t.deepEqual(node.props.children[0].props, {children: []});
	t.deepEqual(node.props.children[0].children, []);

	t.is(node.props.children[1].component, Div);
	t.deepEqual(node.props.children[1].children, []);
	t.is(node.props.children[1].props.children.length, 1);
	t.is(node.props.children[1].props.children[0].component, Span);
	t.deepEqual(node.props.children[1].props.children[0].props, {children: []});
	t.deepEqual(node.props.children[1].props.children[0].children, []);
});

test('children - flatten one layer as needed', t => {
	const node = h('div', null, h('span'), [h('div', null, h('span'))]);

	t.is(node.props.children.length, 2);

	t.is(node.props.children[0].component, Span);
	t.deepEqual(node.props.children[0].props, {children: []});
	t.deepEqual(node.props.children[0].children, []);

	t.is(node.props.children[1].component, Div);
	t.deepEqual(node.props.children[1].children, []);
	t.is(node.props.children[1].props.children.length, 1);
	t.is(node.props.children[1].props.children[0].component, Span);
	t.deepEqual(node.props.children[1].props.children[0].props, {children: []});
	t.deepEqual(node.props.children[1].props.children[0].children, []);
});

test('nested children', t => {
	let node = h('div', null, h('span'), [h('span'), h('div'), h('span')]);
	t.deepEqual(node.props.children.map(child => child.component), [Span, Span, Div, Span]);

	node = h('div', null, [h('span'), [h('span'), h('div'), h('span')]]);
	t.deepEqual(node.props.children.map(child => child.component), [Span, Span, Div, Span]);

	node = h('div', {children: [h('span'), [h('span'), h('div'), h('span')]]});
	t.deepEqual(node.props.children.map(child => child.component), [Span, Span, Div, Span]);

	node = h('div', {children: [[h('span'), [h('span'), h('div'), h('span')]]]});
	t.deepEqual(node.props.children.map(child => child.component), [Span, Span, Div, Span]);
});

test('text children', t => {
	const node = h('span', null, 'helloworld');

	t.deepEqual(node.props.children, ['helloworld']);
});

test('merge adjacent text children', t => {
	const node = h('span', null, [
		'one',
		'two',
		h('span'),
		'three',
		h('div'),
		h('span'),
		'four',
		null,
		'five',
		'six'
	]);

	t.is(node.props.children.length, 6);
	t.is(node.props.children[0], 'onetwo');
	t.is(node.props.children[1].component, Span);
	t.is(node.props.children[2], 'three');
	t.is(node.props.children[3].component, Div);
	t.is(node.props.children[4].component, Span);
	t.is(node.props.children[5], 'fourfivesix');
});

test('merge nested adjacent text children', t => {
	const node = h('span', null, [
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
	const node = h('span', null, [
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
