import {act} from 'react';
import {render, type Instance} from '../../src/index.js';
import createStdout from './create-stdout.js';

type TestRenderOptions = {
	columns?: number;
	isScreenReaderEnabled?: boolean;
};

export type TestInstance = Instance & {
	stdout: ReturnType<typeof createStdout>;
	getOutput: () => string;
	rerenderAsync: (node: React.ReactNode) => Promise<void>;
};

/**
 * Render helper that supports concurrent mode with act() wrapping.
 * Uses act() to properly flush updates in concurrent mode.
 */
export async function renderAsync(
	node: React.ReactNode,
	options: TestRenderOptions = {},
): Promise<TestInstance> {
	const stdout = createStdout(options.columns ?? 100);

	let instance!: Instance;

	await act(async () => {
		instance = render(node, {
			stdout,
			debug: true,
			concurrent: true,
			isScreenReaderEnabled: options.isScreenReaderEnabled,
		});
	});

	return {
		...instance,
		stdout,
		getOutput: () => stdout.get(),
		async rerenderAsync(newNode: React.ReactNode) {
			await act(async () => {
				instance.rerender(newNode);
			});
		},
	};
}

/**
 * Synchronous render for legacy mode tests (backward compatible).
 */
export function renderSync(
	node: React.ReactNode,
	options: TestRenderOptions = {},
): TestInstance {
	const stdout = createStdout(options.columns ?? 100);

	const instance = render(node, {
		stdout,
		debug: true,
		concurrent: false,
		isScreenReaderEnabled: options.isScreenReaderEnabled,
	});

	return {
		...instance,
		stdout,
		getOutput: () => stdout.get(),
		async rerenderAsync(newNode: React.ReactNode) {
			instance.rerender(newNode);
		},
	};
}

/**
 * Wrapper to make existing sync code work with concurrent mode.
 * Use this to gradually migrate tests.
 */
export async function withAct<T>(fn: () => T | Promise<T>): Promise<T> {
	let result!: T;
	await act(async () => {
		result = await fn();
	});
	return result;
}

/**
 * Wait for pending suspense boundaries to resolve.
 */
export async function waitForSuspense(ms = 0): Promise<void> {
	await act(async () => {
		await new Promise<void>(resolve => {
			setTimeout(resolve, ms);
		});
	});
}
