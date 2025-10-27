import React, {useRef, useLayoutEffect} from 'react';
import test from 'ava';
import {spy} from 'sinon';
import {
	render,
	Box,
	measureElement,
	getBoundingBox,
	getInnerWidth,
	getInnerHeight,
	getScrollHeight,
	getScrollWidth,
	Text,
	type DOMElement,
} from '../src/index.js';
import createStdout from './helpers/create-stdout.js';

test('measure element', t => {
	const onLayout = spy();

	function Test() {
		const ref = useRef<DOMElement>(null);

		useLayoutEffect(() => {
			if (ref.current) {
				const layout = measureElement(ref.current);
				onLayout(layout);
			}
		});

		return (
			<Box ref={ref} width={10} height={10} padding={2}>
				<Text>X</Text>
			</Box>
		);
	}

	render(<Test />, {
		stdout: createStdout(),
		debug: true,
	});

	t.true(onLayout.calledOnce);
	t.deepEqual(onLayout.firstCall.args[0], {
		width: 10,
		height: 10,
	});
});

test('get bounding box', t => {
	const onLayout = spy();

	function Test() {
		const ref = useRef<DOMElement>(null);

		useLayoutEffect(() => {
			if (ref.current) {
				const layout = getBoundingBox(ref.current);
				onLayout(layout);
			}
		});

		return (
			<Box ref={ref} width={10} height={10} padding={2}>
				<Text>X</Text>
			</Box>
		);
	}

	render(<Test />, {
		stdout: createStdout(),
		debug: true,
	});

	t.true(onLayout.calledOnce);
	t.deepEqual(onLayout.firstCall.args[0], {
		x: 0,
		y: 0,
		width: 10,
		height: 10,
	});
});

test('get inner width', t => {
	const onLayout = spy();

	function Test() {
		const ref = useRef<DOMElement>(null);

		useLayoutEffect(() => {
			if (ref.current) {
				const innerWidth = getInnerWidth(ref.current);
				onLayout({innerWidth});
			}
		});

		return (
			<Box ref={ref} width={10} padding={2} borderStyle="single">
				<Text>X</Text>
			</Box>
		);
	}

	render(<Test />, {
		stdout: createStdout(),
		debug: true,
	});

	t.true(onLayout.calledOnce);
	t.deepEqual(onLayout.firstCall.args[0], {
		innerWidth: 8,
	});
});

test('get inner height', t => {
	const onLayout = spy();

	function Test() {
		const ref = useRef<DOMElement>(null);

		useLayoutEffect(() => {
			if (ref.current) {
				const innerHeight = getInnerHeight(ref.current);
				onLayout({innerHeight});
			}
		});

		return (
			<Box ref={ref} height={10} padding={2} borderStyle="single">
				<Text>X</Text>
			</Box>
		);
	}

	render(<Test />, {
		stdout: createStdout(),
		debug: true,
	});

	t.true(onLayout.calledOnce);
	t.deepEqual(onLayout.firstCall.args[0], {
		innerHeight: 8,
	});
});

test('get bounding box of nested element', t => {
	const onLayout = spy();

	function Test() {
		const ref = useRef<DOMElement>(null);

		useLayoutEffect(() => {
			if (ref.current) {
				const layout = getBoundingBox(ref.current);
				onLayout(layout);
			}
		});

		return (
			<Box paddingTop={2} paddingLeft={5}>
				<Box ref={ref} marginTop={2} marginLeft={5} width={10} height={10} />
			</Box>
		);
	}

	render(<Test />, {
		stdout: createStdout(),
		debug: true,
	});

	t.true(onLayout.calledOnce);
	t.like(onLayout.firstCall.args[0], {
		x: 10,
		y: 4,
		width: 10,
		height: 10,
	});
});

test('get scroll height and width', t => {
	const onLayout = spy();

	function Test() {
		const ref = useRef<DOMElement>(null);

		useLayoutEffect(() => {
			if (ref.current) {
				const scrollHeight = getScrollHeight(ref.current);
				const scrollWidth = getScrollWidth(ref.current);
				onLayout({scrollHeight, scrollWidth});
			}
		});

		return (
			<Box ref={ref} width={10} height={10}>
				<Box width={20} height={20} />
			</Box>
		);
	}

	render(<Test />, {
		stdout: createStdout(),
		debug: true,
	});

	t.true(onLayout.calledOnce);
	t.like(onLayout.firstCall.args[0], {
		scrollWidth: 10,
		scrollHeight: 20,
	});
});

test('get bounding box with scroll position', t => {
	const onLayout = spy();

	function Test() {
		const ref = useRef<DOMElement>(null);

		useLayoutEffect(() => {
			if (ref.current) {
				const layout = getBoundingBox(ref.current);
				onLayout(layout);
			}
		});

		return (
			<Box
				width={10}
				height={10}
				overflow="scroll"
				scrollTop={5}
				scrollLeft={5}
			>
				<Box ref={ref} marginTop={2} marginLeft={5} width={10} height={10} />
			</Box>
		);
	}

	render(<Test />, {
		stdout: createStdout(),
		debug: true,
	});

	t.true(onLayout.calledOnce);
	t.like(onLayout.firstCall.args[0], {
		x: 5,
		y: 0,
		width: 5,
		height: 10,
	});
});
