import React, {useRef, useState} from 'react';
import test from 'ava';
import delay from 'delay';
import stripAnsi from 'strip-ansi';
import {
	Box,
	Text,
	render,
	useBoxMetrics,
	type DOMElement,
} from '../src/index.js';
import createStdout from './helpers/create-stdout.js';

test('returns correct size on first render', async t => {
	const stdout = createStdout(100);

	function Test() {
		const ref = useRef<DOMElement>(null);
		const {width, height} = useBoxMetrics(ref);
		return (
			<Box ref={ref}>
				<Text>
					{width}x{height}
				</Text>
			</Box>
		);
	}

	const {waitUntilRenderFlush} = render(<Test />, {stdout, debug: true});
	await waitUntilRenderFlush();
	await delay(50);

	// Width fills terminal (100); single-line text renders as height 1
	t.true(stripAnsi(stdout.get()).includes('100x1'));
});

test('returns correct position', async t => {
	const stdout = createStdout(100);

	function Test() {
		const ref = useRef<DOMElement>(null);
		const {left, top} = useBoxMetrics(ref);
		return (
			<Box flexDirection="column">
				<Text>first line</Text>
				<Box ref={ref} marginLeft={5}>
					<Text>
						{left},{top}
					</Text>
				</Box>
			</Box>
		);
	}

	const {waitUntilRenderFlush} = render(<Test />, {stdout, debug: true});
	await waitUntilRenderFlush();
	await delay(50);

	// MarginLeft=5 → left=5; second row → top=1
	t.true(stripAnsi(stdout.get()).includes('5,1'));
});

test('updates when terminal is resized', async t => {
	const stdout = createStdout(100);

	function Test() {
		const ref = useRef<DOMElement>(null);
		const {width} = useBoxMetrics(ref);
		return (
			<Box ref={ref}>
				<Text>Width: {width}</Text>
			</Box>
		);
	}

	const {waitUntilRenderFlush} = render(<Test />, {stdout, debug: true});
	await waitUntilRenderFlush();
	await delay(50);

	t.true(stripAnsi(stdout.get()).includes('Width: 100'));

	(stdout as any).columns = 60;
	stdout.emit('resize');
	await delay(200);

	t.true(stripAnsi(stdout.get()).includes('Width: 60'));
});

test('uses latest tracked ref when terminal is resized', async t => {
	const stdout = createStdout(100);
	let trackSecondRef!: () => void;

	function Test() {
		const firstRef = useRef<DOMElement>(null);
		const secondRef = useRef<DOMElement>(null);
		const [isSecondRefTracked, setIsSecondRefTracked] = useState(false);
		const trackedRef = isSecondRefTracked ? secondRef : firstRef;
		const {height} = useBoxMetrics(trackedRef);

		trackSecondRef = () => {
			setIsSecondRefTracked(true);
		};

		return (
			<Box flexDirection="column">
				<Box ref={firstRef}>
					<Text>short</Text>
				</Box>
				<Box ref={secondRef}>
					<Text>
						ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789
					</Text>
				</Box>
				<Text>Tracked height: {height}</Text>
			</Box>
		);
	}

	const {waitUntilRenderFlush} = render(<Test />, {stdout, debug: true});
	await waitUntilRenderFlush();
	await delay(50);

	t.true(stripAnsi(stdout.get()).includes('Tracked height: 1'));

	trackSecondRef();
	await waitUntilRenderFlush();
	await delay(50);

	t.true(stripAnsi(stdout.get()).includes('Tracked height: 1'));

	(stdout as any).columns = 20;
	stdout.emit('resize');
	await delay(200);

	t.true(stripAnsi(stdout.get()).includes('Tracked height: 4'));
});

test('updates when sibling content changes', async t => {
	const stdout = createStdout(100);
	let externalSetSiblingText!: (text: string) => void;

	function Test() {
		const ref = useRef<DOMElement>(null);
		const [siblingText, setSiblingText] = useState('short');
		const {height} = useBoxMetrics(ref);

		externalSetSiblingText = setSiblingText;

		return (
			<Box flexDirection="column">
				<Box ref={ref} flexDirection="column">
					<Text>{siblingText}</Text>
				</Box>
				<Text>Height: {height}</Text>
			</Box>
		);
	}

	const {waitUntilRenderFlush} = render(<Test />, {stdout, debug: true});
	await waitUntilRenderFlush();
	await delay(50);

	t.true(stripAnsi(stdout.get()).includes('Height: 1'));

	externalSetSiblingText('line 1\nline 2\nline 3');
	await delay(50);

	t.true(stripAnsi(stdout.get()).includes('Height: 3'));
});

test('updates when sibling content changes but tracked component is memoized', async t => {
	const stdout = createStdout(100);
	let externalSetSiblingText!: (text: string) => void;

	const MemoizedTrackedBox = React.memo(function () {
		const ref = useRef<DOMElement>(null);
		const {top} = useBoxMetrics(ref);

		return (
			<Box ref={ref}>
				<Text>Top: {top}</Text>
			</Box>
		);
	});

	function Test() {
		const [siblingText, setSiblingText] = useState('line 1');
		externalSetSiblingText = setSiblingText;

		return (
			<Box flexDirection="column">
				<Text>{siblingText}</Text>
				<MemoizedTrackedBox />
			</Box>
		);
	}

	const {waitUntilRenderFlush} = render(<Test />, {stdout, debug: true});
	await waitUntilRenderFlush();
	await delay(50);

	t.true(stripAnsi(stdout.get()).includes('Top: 1'));

	externalSetSiblingText('line 1\nline 2\nline 3');
	await waitUntilRenderFlush();
	await delay(50);

	t.true(stripAnsi(stdout.get()).includes('Top: 3'));
});

test('updates when tracked ref attaches after initial render and component is memoized', async t => {
	const stdout = createStdout(100);
	let externalSetSiblingText!: (text: string) => void;
	let externalSetIsTrackedElementMounted!: (value: boolean) => void;

	const MemoizedTrackedBox = React.memo(function ({
		isTrackedElementMounted,
	}: {
		readonly isTrackedElementMounted: boolean;
	}) {
		const ref = useRef<DOMElement>(null);
		const {top} = useBoxMetrics(ref);

		return isTrackedElementMounted ? (
			<Box ref={ref}>
				<Text>Top: {top}</Text>
			</Box>
		) : (
			<Text>Top: {top}</Text>
		);
	});

	function Test() {
		const [siblingText, setSiblingText] = useState('line 1');
		const [isTrackedElementMounted, setIsTrackedElementMounted] =
			useState(false);
		externalSetSiblingText = setSiblingText;
		externalSetIsTrackedElementMounted = setIsTrackedElementMounted;

		return (
			<Box flexDirection="column">
				<Text>{siblingText}</Text>
				<MemoizedTrackedBox isTrackedElementMounted={isTrackedElementMounted} />
			</Box>
		);
	}

	const {waitUntilRenderFlush} = render(<Test />, {stdout, debug: true});
	await waitUntilRenderFlush();
	await delay(50);

	t.true(stripAnsi(stdout.get()).includes('Top: 0'));

	externalSetIsTrackedElementMounted(true);
	await waitUntilRenderFlush();
	await delay(50);

	t.true(stripAnsi(stdout.get()).includes('Top: 1'));

	externalSetSiblingText('line 1\nline 2\nline 3');
	await waitUntilRenderFlush();
	await delay(50);

	t.true(stripAnsi(stdout.get()).includes('Top: 3'));
});

test('does not trigger extra re-renders when layout is unchanged', async t => {
	const stdout = createStdout(100);
	let renderCount = 0;

	function Test() {
		const ref = useRef<DOMElement>(null);
		useBoxMetrics(ref);
		renderCount++;
		return (
			<Box ref={ref}>
				<Text>Hello</Text>
			</Box>
		);
	}

	const {waitUntilRenderFlush} = render(<Test />, {stdout, debug: true});
	await waitUntilRenderFlush();
	await delay(100);

	// Renders settle at 2: initial render (layout all zeros) → setLayout triggers
	// re-render (layout measured) → bail-out prevents any further renders.
	t.true(renderCount >= 2 && renderCount <= 3);
});

function SimpleBox() {
	const ref = useRef<DOMElement>(null);
	useBoxMetrics(ref);
	return (
		<Box ref={ref}>
			<Text>Hello</Text>
		</Box>
	);
}

test.serial('removes resize listener on unmount', async t => {
	const stdout = createStdout(100);

	const initialListenerCount = stdout.listenerCount('resize');
	const {unmount, waitUntilRenderFlush} = render(<SimpleBox />, {stdout});
	await waitUntilRenderFlush();

	t.true(stdout.listenerCount('resize') > initialListenerCount);
	unmount();

	t.is(stdout.listenerCount('resize'), initialListenerCount);
});

test.serial('does not crash when resize fires after unmount', async t => {
	const stdout = createStdout(100);

	const {unmount, waitUntilRenderFlush} = render(<SimpleBox />, {stdout});
	await waitUntilRenderFlush();
	unmount();

	stdout.emit('resize');
	await delay(50);

	t.pass();
});

test('returns zeros when ref is not attached', async t => {
	const stdout = createStdout(100);

	function Test() {
		const ref = useRef<DOMElement>(null);
		const {width, height, left, top, hasMeasured} = useBoxMetrics(ref);
		return (
			<Box>
				<Text>
					{width},{height},{left},{top},{String(hasMeasured)}
				</Text>
			</Box>
		);
	}

	const {waitUntilRenderFlush} = render(<Test />, {stdout, debug: true});
	await waitUntilRenderFlush();
	await delay(50);

	t.true(stripAnsi(stdout.get()).includes('0,0,0,0,false'));
});

test('hasMeasured becomes true when tracked element is mounted on initial render', async t => {
	const stdout = createStdout(100);

	function Test() {
		const ref = useRef<DOMElement>(null);
		const {hasMeasured} = useBoxMetrics(ref);

		return (
			<Box ref={ref}>
				<Text>Has measured: {String(hasMeasured)}</Text>
			</Box>
		);
	}

	const {waitUntilRenderFlush} = render(<Test />, {stdout, debug: true});
	await waitUntilRenderFlush();
	await delay(50);

	t.true(stripAnsi(stdout.get()).includes('Has measured: true'));
});

test('hasMeasured resets when tracked ref switches to a detached element', async t => {
	const stdout = createStdout(100);
	let trackSecondRef!: () => void;
	let mountSecondRef!: () => void;

	function Test() {
		const firstRef = useRef<DOMElement>(null);
		const secondRef = useRef<DOMElement>(null);
		const [isSecondRefTracked, setIsSecondRefTracked] = useState(false);
		const [isSecondRefMounted, setIsSecondRefMounted] = useState(false);
		const trackedRef = isSecondRefTracked ? secondRef : firstRef;
		const {hasMeasured} = useBoxMetrics(trackedRef);

		trackSecondRef = () => {
			setIsSecondRefTracked(true);
		};

		mountSecondRef = () => {
			setIsSecondRefMounted(true);
		};

		return (
			<Box flexDirection="column">
				<Box ref={firstRef}>
					<Text>First</Text>
				</Box>
				{isSecondRefMounted ? (
					<Box ref={secondRef}>
						<Text>Second</Text>
					</Box>
				) : undefined}
				<Text>Has measured: {String(hasMeasured)}</Text>
			</Box>
		);
	}

	const {waitUntilRenderFlush} = render(<Test />, {stdout, debug: true});
	await waitUntilRenderFlush();
	await delay(50);

	t.true(stripAnsi(stdout.get()).includes('Has measured: true'));

	trackSecondRef();
	await waitUntilRenderFlush();
	await delay(50);

	t.true(stripAnsi(stdout.get()).includes('Has measured: false'));

	mountSecondRef();
	await waitUntilRenderFlush();
	await delay(50);

	t.true(stripAnsi(stdout.get()).includes('Has measured: true'));
});

test('hasMeasured becomes true after the tracked element is measured', async t => {
	const stdout = createStdout(100);
	let mountTrackedElement!: () => void;

	function Test() {
		const ref = useRef<DOMElement>(null);
		const [isTrackedElementMounted, setIsTrackedElementMounted] =
			useState(false);
		const {hasMeasured} = useBoxMetrics(ref);

		mountTrackedElement = () => {
			setIsTrackedElementMounted(true);
		};

		return (
			<Box flexDirection="column">
				{isTrackedElementMounted ? (
					<Box ref={ref}>
						<Text>Tracked</Text>
					</Box>
				) : undefined}
				<Text>Has measured: {String(hasMeasured)}</Text>
			</Box>
		);
	}

	const {waitUntilRenderFlush} = render(<Test />, {stdout, debug: true});
	await waitUntilRenderFlush();
	await delay(50);

	t.true(stripAnsi(stdout.get()).includes('Has measured: false'));

	mountTrackedElement();
	await waitUntilRenderFlush();
	await delay(50);

	t.true(stripAnsi(stdout.get()).includes('Has measured: true'));
});

test('resets metrics when tracked element unmounts', async t => {
	const stdout = createStdout(100);
	let unmountTrackedElement!: () => void;

	function Test() {
		const ref = useRef<DOMElement>(null);
		const [isTrackedElementMounted, setIsTrackedElementMounted] =
			useState(true);
		const {width, height, left, top, hasMeasured} = useBoxMetrics(ref);

		unmountTrackedElement = () => {
			setIsTrackedElementMounted(false);
		};

		return (
			<Box flexDirection="column">
				{isTrackedElementMounted ? (
					<Box ref={ref} width={10}>
						<Text>1234567890</Text>
					</Box>
				) : undefined}
				<Text>
					Metrics: {width},{height},{left},{top},{String(hasMeasured)}
				</Text>
			</Box>
		);
	}

	const {waitUntilRenderFlush} = render(<Test />, {stdout, debug: true});
	await waitUntilRenderFlush();
	await delay(50);

	t.true(stripAnsi(stdout.get()).includes('Metrics: 10,1,0,0,true'));

	unmountTrackedElement();
	await waitUntilRenderFlush();
	await delay(50);

	t.true(stripAnsi(stdout.get()).includes('Metrics: 0,0,0,0,false'));
});
