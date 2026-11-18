import test, {type TestContext} from 'node:test';
import React, {Activity, Component, Suspense, use} from 'react';
import {spy} from 'sinon';
import Yoga from 'yoga-layout';
import {Box, Text, measureElement, render} from '../src/index.js';
import createStdout from './helpers/create-stdout.js';
import {renderAsync} from './helpers/test-renderer.js';
import {act} from './helpers/act.js';

// Count the Yoga nodes that are allocated and not freed yet. `freeRecursive()` calls `free()` for each node.
const createYogaNode = spy(Yoga.Node, 'create');
const freeYogaNode = spy(
	(Yoga.Node as unknown as {prototype: {free: () => void}}).prototype,
	'free',
);
const countYogaNodes = () => createYogaNode.callCount - freeYogaNode.callCount;

for (const isConcurrent of [false, true]) {
	test(`render that suspends does not leak Yoga nodes (concurrent: ${isConcurrent})`, async (t: TestContext) => {
		const {promise, resolve} = Promise.withResolvers<string>();

		function Data() {
			return <Text>{use(promise)}</Text>;
		}

		const stdout = createStdout();
		const yogaNodesBefore = countYogaNodes();
		let unmount!: () => void;
		await act(async () => {
			({unmount} = render(
				<Suspense fallback={<Text>Loading</Text>}>
					<Box>
						<Text>Row</Text>
					</Box>
					<Data />
				</Suspense>,
				{stdout, debug: true, concurrent: isConcurrent},
			));
		});

		// React created the row before `Data` suspended and then threw that render away, so only the root and the fallback have a Yoga node.
		t.assert.strictEqual(stdout.get(), 'Loading');
		t.assert.strictEqual(countYogaNodes() - yogaNodesBefore, 2);

		await act(async () => {
			resolve('Data');
		});

		t.assert.strictEqual(stdout.get(), 'Row\nData');
		t.assert.strictEqual(countYogaNodes() - yogaNodesBefore, 4);

		await act(async () => {
			unmount();
		});

		t.assert.strictEqual(countYogaNodes() - yogaNodesBefore, 0);
	});
}

class ErrorBoundary extends Component<{children?: React.ReactNode}> {
	static getDerivedStateFromError() {
		return {hasError: true};
	}

	override state = {hasError: false};

	override render(): React.ReactNode {
		return this.state.hasError ? <Text>Failed</Text> : this.props.children;
	}
}

function Thrower(): React.ReactNode {
	throw new Error('Oh no');
}

for (const isConcurrent of [false, true]) {
	test(`render caught by an error boundary does not leak Yoga nodes (concurrent: ${isConcurrent})`, async (t: TestContext) => {
		const stdout = createStdout();
		const yogaNodesBefore = countYogaNodes();
		let unmount!: () => void;
		await act(async () => {
			({unmount} = render(
				<ErrorBoundary>
					<Box>
						<Text>Row</Text>
					</Box>
					<Thrower />
				</ErrorBoundary>,
				{stdout, debug: true, patchConsole: false, concurrent: isConcurrent},
			));
		});

		t.assert.strictEqual(stdout.get(), 'Failed');
		t.assert.strictEqual(countYogaNodes() - yogaNodesBefore, 2);

		await act(async () => {
			unmount();
		});

		t.assert.strictEqual(countYogaNodes() - yogaNodesBefore, 0);
	});
}

test('style value that Yoga rejects is caught by an error boundary mounted in the same commit', (t: TestContext) => {
	const stdout = createStdout();
	const {unmount} = render(
		<ErrorBoundary>
			<Box marginLeft={false as unknown as number}>
				<Text>Row</Text>
			</Box>
		</ErrorBoundary>,
		{stdout, debug: true, patchConsole: false},
	);
	t.after(unmount);

	t.assert.strictEqual(stdout.get(), 'Failed');
});

test('content that React hides before attaching it stays hidden', async (t: TestContext) => {
	// React hides the content of the inner `<Activity>` first and attaches it to the tree after that.
	const {getOutput, unmount} = await renderAsync(
		<Box flexDirection="column">
			<Text>Visible</Text>
			<Activity mode="hidden">
				<Activity mode="hidden">
					<Box display="flex">
						<Text>Hidden</Text>
					</Box>
				</Activity>
			</Activity>
		</Box>,
	);
	t.after(unmount);

	t.assert.strictEqual(getOutput(), 'Visible');
});

test('ref callback can measure its element on mount', (t: TestContext) => {
	const widths: number[] = [];
	const {unmount} = render(
		<Box>
			<Box
				ref={node => {
					if (!node) {
						return;
					}

					widths.push(measureElement(node).width);
				}}
				width={10}
			>
				<Text>Hello</Text>
			</Box>
		</Box>,
		{stdout: createStdout(), debug: true},
	);
	t.after(unmount);

	t.assert.deepStrictEqual(widths, [10]);
});
