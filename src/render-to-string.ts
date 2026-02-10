import type {ReactNode} from 'react';
import Yoga from 'yoga-layout';
import {LegacyRoot} from 'react-reconciler/constants.js';
import reconciler from './reconciler.js';
import renderer from './renderer.js';
import {createNode, type DOMElement} from './dom.js';

export type RenderToStringOptions = {
	/**
	Width of the virtual terminal in columns.

	@default 80
	*/
	columns?: number;
};

/**
Render a React element to a string synchronously. Unlike `render()`, this function does not write to stdout, does not set up any terminal event listeners, and returns the rendered output as a string.

Useful for generating documentation, writing output to files, testing, or any scenario where you need the rendered output as a string without starting a persistent terminal application.

**Notes:**

- Terminal-specific hooks (`useInput`, `useStdin`, `useStdout`, `useStderr`, `useApp`, `useFocus`, `useFocusManager`) return default no-op values since there is no terminal session. They will not throw, but they will not function as in a live terminal.
- `useEffect` callbacks will execute during rendering (due to synchronous rendering mode), but state updates they trigger will not affect the returned output, which reflects the initial render.
- `useLayoutEffect` callbacks fire synchronously during commit, so state updates they trigger **will** be reflected in the output.
- The `<Static>` component is supported — its output is prepended to the dynamic output.
- If a component throws during rendering, the error is propagated to the caller after cleanup.

@example
```
import {renderToString, Text, Box} from 'ink';

const output = renderToString(
	<Box padding={1}>
		<Text color="green">Hello World</Text>
	</Box>,
	{columns: 40}
);

console.log(output);
```
*/
const renderToString = (
	node: ReactNode,
	options?: RenderToStringOptions,
): string => {
	const columns = options?.columns ?? 80;

	// Create a standalone root node — no stdout, stdin, or terminal bindings
	const rootNode: DOMElement = createNode('ink-root');

	// Capture static output from intermediate renders.
	// The <Static> component uses useLayoutEffect to clear its children after
	// the first commit. The reconciler's resetAfterCommit calls onImmediateRender
	// when static content is dirty (and returns early, skipping the normal
	// onRender callback), giving us a chance to capture it before it's cleared
	// by the subsequent re-render.
	let capturedStaticOutput = '';

	rootNode.onComputeLayout = () => {
		rootNode.yogaNode!.setWidth(columns);
		rootNode.yogaNode!.calculateLayout(
			undefined,
			undefined,
			Yoga.DIRECTION_LTR,
		);
	};

	rootNode.onImmediateRender = () => {
		const {staticOutput} = renderer(rootNode, false);
		if (staticOutput && staticOutput !== '\n') {
			capturedStaticOutput += staticOutput;
		}
	};

	// Capture the first uncaught error so we can re-throw it after cleanup.
	// React's reconciler catches component errors internally and reports them
	// via onUncaughtError rather than letting them propagate. For a synchronous
	// utility like renderToString, callers expect errors to throw.
	let uncaughtError: unknown;

	// Create a reconciler container in legacy (synchronous) mode.
	// The four trailing callbacks are: onUncaughtError, onCaughtError,
	// onRecoverableError, and onHostTransitionComplete.
	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
	const container = reconciler.createContainer(
		rootNode,
		LegacyRoot,
		null,
		false,
		null,
		'render-to-string',
		(error: unknown) => {
			uncaughtError ??= error;
		},
		() => {},
		() => {},
		() => {},
	);

	let teardownSucceeded = false;

	try {
		// Synchronously render the React tree into the container
		reconciler.updateContainerSync(node, container, null, () => {});
		reconciler.flushSyncWork();

		// Yoga layout has already been calculated by onComputeLayout during commit.
		// Render the DOM tree to a string — this captures the dynamic (non-static) output.
		const {output} = renderer(rootNode, false);

		// Tear down: unmount the tree so the reconciler cleans up child nodes
		// and runs effect cleanup functions. Child Yoga nodes are freed by the
		// reconciler's removeChildFromContainer → cleanupYogaNode → freeRecursive.
		reconciler.updateContainerSync(null, container, null, () => {});
		reconciler.flushSyncWork();
		teardownSucceeded = true;

		// Free the root yoga node itself (children already freed by reconciler)
		rootNode.yogaNode!.free();

		// Re-throw after full cleanup so callers see the original error.
		if (uncaughtError !== undefined) {
			throw uncaughtError instanceof Error
				? uncaughtError
				: new Error(String(uncaughtError));
		}

		// The renderer appends a trailing newline to static output for terminal
		// rendering (so dynamic output starts on a fresh line). Strip it here
		// so renderToString returns clean output.
		const normalizedStaticOutput = capturedStaticOutput.endsWith('\n')
			? capturedStaticOutput.slice(0, -1)
			: capturedStaticOutput;

		if (normalizedStaticOutput && output) {
			return normalizedStaticOutput + '\n' + output;
		}

		return normalizedStaticOutput || output;
	} finally {
		// Ensure native Yoga memory is freed even if rendering or teardown threw.
		// Yoga nodes are WASM-backed and not garbage collected.
		if (!teardownSucceeded && rootNode.yogaNode) {
			try {
				// If reconciler teardown failed, some child nodes may not have been
				// freed. Use freeRecursive to clean up the entire tree as best-effort.
				rootNode.yogaNode.freeRecursive();
			} catch {
				// Best-effort: node may already be partially freed
			}
		}
	}
};

export default renderToString;
