import {Buffer} from 'node:buffer';
import {Writable} from 'node:stream';
import test, {type TestContext} from 'node:test';
import React, {useEffect, useLayoutEffect, useState} from 'react';
import stripAnsi from 'strip-ansi';
import FakeTimers from '@sinonjs/fake-timers';
import {
	render,
	Static,
	Text,
	useInput,
	usePaste,
	useStderr,
	useStdout,
} from '../src/index.js';
import createStdout, {type FakeStdout} from './helpers/create-stdout.js';
import {createStdin, emitReadable} from './helpers/create-stdin.js';
import {reconstructTerminalLines} from './helpers/reconstruct-terminal.js';

const countOccurrences = (text: string, searchValue: string): number =>
	searchValue === '' ? 0 : text.split(searchValue).length - 1;

const isWriteBarrierChunk = (chunk: string | Uint8Array): boolean =>
	(typeof chunk === 'string' && chunk === '') ||
	(chunk instanceof Uint8Array && chunk.length === 0);

const toRenderedChunk = (chunk: string | Uint8Array): string =>
	stripAnsi(typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString());

const toRenderedOutput = (chunks: Array<string | Uint8Array>): string =>
	chunks.map(chunk => toRenderedChunk(chunk)).join('');

const createCapturedWritableTtyStdout = (): {
	stdout: NodeJS.WriteStream;
	writes: string[];
} => {
	const writes: string[] = [];
	const stdout = new Writable({
		write(
			chunk: string | Uint8Array,
			_encoding: BufferEncoding,
			callback: (error?: Error) => void,
		) {
			writes.push(typeof chunk === 'string' ? chunk : chunk.toString());
			callback();
		},
	}) as unknown as NodeJS.WriteStream;

	stdout.columns = 100;
	stdout.rows = 24;
	stdout.isTTY = true;

	return {stdout, writes};
};

const assertMountUseEffectUpdateRendersInitialFrame = async (
	t: TestContext,
	options: {
		readonly stdout: NodeJS.WriteStream;
		readonly writes: string[];
		readonly concurrent?: boolean;
	},
) => {
	function Test() {
		const [text, setText] = useState('first frame');

		useEffect(() => {
			setText('after useEffect');
		}, []);

		return <Text>{text}</Text>;
	}

	const {unmount, waitUntilExit, waitUntilRenderFlush} = render(<Test />, {
		stdout: options.stdout,
		interactive: true,
		concurrent: options.concurrent,
	});

	t.after(async () => {
		unmount();
		await waitUntilExit();
	});

	await waitUntilRenderFlush();
	await waitUntilRenderFlush();

	const renderedOutput = toRenderedOutput(options.writes);
	const firstFrameIndex = renderedOutput.indexOf('first frame');
	const afterUseEffectIndex = renderedOutput.indexOf('after useEffect');

	t.assert.ok(firstFrameIndex !== -1);
	t.assert.ok(afterUseEffectIndex !== -1);
	t.assert.ok(firstFrameIndex < afterUseEffectIndex);
};

const assertMountLayoutAndUseEffectCoalesceToLatestOutput = async (
	t: TestContext,
	options: {
		readonly stdout: NodeJS.WriteStream;
		readonly writes: string[];
		readonly concurrent?: boolean;
	},
) => {
	function Test() {
		const [text, setText] = useState('initial');

		useLayoutEffect(() => {
			setText('after layout');
		}, []);

		useEffect(() => {
			setText('after effect');
		}, []);

		return <Text>{text}</Text>;
	}

	const {unmount, waitUntilExit, waitUntilRenderFlush} = render(<Test />, {
		stdout: options.stdout,
		interactive: true,
		concurrent: options.concurrent,
	});

	t.after(async () => {
		unmount();
		await waitUntilExit();
	});

	await waitUntilRenderFlush();

	const renderedOutput = toRenderedOutput(options.writes);
	t.assert.ok(!renderedOutput.includes('initial'));
	t.assert.ok(!renderedOutput.includes('after layout'));
	t.assert.ok(renderedOutput.includes('after effect'));
};

const assertMountUseEffectUpdateRendersInitialFrameWhenRenderingIsThrottled =
	async (
		t: TestContext,
		options: {
			readonly stdout: NodeJS.WriteStream;
			readonly writes: string[];
			readonly concurrent?: boolean;
		},
	) => {
		function Test() {
			const [text, setText] = useState('first frame');

			useEffect(() => {
				setText('after useEffect');
			}, []);

			return <Text>{text}</Text>;
		}

		const {unmount, waitUntilExit, waitUntilRenderFlush} = render(<Test />, {
			stdout: options.stdout,
			interactive: true,
			maxFps: 1,
			concurrent: options.concurrent,
		});

		t.after(async () => {
			unmount();
			await waitUntilExit();
		});

		await waitUntilRenderFlush();
		await waitUntilRenderFlush();

		const renderedOutput = toRenderedOutput(options.writes);
		const firstFrameIndex = renderedOutput.indexOf('first frame');
		const afterUseEffectIndex = renderedOutput.indexOf('after useEffect');

		t.assert.ok(firstFrameIndex !== -1);
		t.assert.ok(afterUseEffectIndex !== -1);
		t.assert.ok(firstFrameIndex < afterUseEffectIndex);
	};

const assertMountUseEffectStaticOutputIsNotDuplicated = async (
	t: TestContext,
	options: {
		readonly stdout: NodeJS.WriteStream;
		readonly writes: string[];
		readonly concurrent?: boolean;
	},
) => {
	function Test() {
		const [text, setText] = useState('first frame');

		useEffect(() => {
			setText('after useEffect');
		}, []);

		return (
			<>
				<Static items={['static once']}>
					{item => <Text key={item}>{item}</Text>}
				</Static>
				<Text>{text}</Text>
			</>
		);
	}

	const {unmount, waitUntilExit, waitUntilRenderFlush} = render(<Test />, {
		stdout: options.stdout,
		interactive: true,
		concurrent: options.concurrent,
	});

	t.after(async () => {
		unmount();
		await waitUntilExit();
	});

	await waitUntilRenderFlush();

	const renderedOutput = toRenderedOutput(options.writes);
	const afterUseEffectIndex = renderedOutput.indexOf('after useEffect');

	t.assert.strictEqual(countOccurrences(renderedOutput, 'static once'), 1);
	t.assert.ok(afterUseEffectIndex !== -1);
};

const assertWaitUntilRenderFlushIncludesFirstFrameLayoutEffectUpdateWhenRenderingIsThrottled =
	async (
		t: TestContext,
		options: {
			readonly stdout: NodeJS.WriteStream;
			readonly writes: string[];
			readonly concurrent?: boolean;
		},
	) => {
		function Test() {
			const [text, setText] = useState('before');

			useLayoutEffect(() => {
				setText('after');
			}, []);

			return <Text>{text}</Text>;
		}

		const {unmount, waitUntilExit, waitUntilRenderFlush} = render(<Test />, {
			stdout: options.stdout,
			interactive: true,
			maxFps: 1,
			concurrent: options.concurrent,
		});

		t.after(async () => {
			unmount();
			await waitUntilExit();
		});

		await waitUntilRenderFlush();

		const renderedOutput = toRenderedOutput(options.writes);
		t.assert.ok(!renderedOutput.includes('before'));
		t.assert.ok(renderedOutput.includes('after'));
	};

const assertThrottledMountLayoutAndUseEffectCoalescingPreservesStaticOutput =
	async (
		t: TestContext,
		options: {
			readonly stdout: NodeJS.WriteStream;
			readonly writes: string[];
			readonly concurrent?: boolean;
		},
	) => {
		function Test() {
			const [text, setText] = useState('initial');

			useLayoutEffect(() => {
				setText('after layout');
			}, []);

			useEffect(() => {
				setText('after effect');
			}, []);

			return (
				<>
					<Static items={['static once']}>
						{item => <Text key={item}>{item}</Text>}
					</Static>
					<Text>{text}</Text>
				</>
			);
		}

		const {unmount, waitUntilExit, waitUntilRenderFlush} = render(<Test />, {
			stdout: options.stdout,
			interactive: true,
			maxFps: 1,
			concurrent: options.concurrent,
		});

		t.after(async () => {
			unmount();
			await waitUntilExit();
		});

		await waitUntilRenderFlush();

		const renderedOutput = toRenderedOutput(options.writes);
		t.assert.strictEqual(countOccurrences(renderedOutput, 'static once'), 1);
		t.assert.ok(!renderedOutput.includes('initial'));
		t.assert.ok(!renderedOutput.includes('after layout'));
		t.assert.ok(renderedOutput.includes('after effect'));
	};

const assertDeferredLayoutCoalescingStillWorksAfterLaterEmptyOutput = async (
	t: TestContext,
	options: {
		readonly stdout: NodeJS.WriteStream;
		readonly writes: string[];
		readonly concurrent?: boolean;
	},
) => {
	function Test({
		isVisible,
		text,
	}: {
		readonly isVisible: boolean;
		readonly text: string;
	}) {
		return isVisible ? <Text>{text}</Text> : null;
	}

	const {unmount, rerender, waitUntilExit, waitUntilRenderFlush} = render(
		<Test isVisible text="first" />,
		{
			stdout: options.stdout,
			interactive: true,
			maxFps: 0,
			concurrent: options.concurrent,
		},
	);

	t.after(async () => {
		unmount();
		await waitUntilExit();
	});

	await waitUntilRenderFlush();
	options.writes.length = 0;

	rerender(<Test isVisible={false} text="first" />);
	await waitUntilRenderFlush();
	options.writes.length = 0;

	rerender(<Test isVisible text="second" />);
	await waitUntilRenderFlush();

	const renderedOutput = toRenderedOutput(options.writes);
	t.assert.ok(renderedOutput.includes('second'));
};

const assertSubsequentMountLayoutEffectUpdatesDoNotRenderIntermediateFrames =
	async (
		t: TestContext,
		options: {
			readonly stdout: NodeJS.WriteStream;
			readonly writes: string[];
			readonly concurrent?: boolean;
		},
	) => {
		function Test({value}: {readonly value: number}) {
			const [text, setText] = useState(`before ${value}`);

			useLayoutEffect(() => {
				setText(`after ${value}`);
			}, [value]);

			return <Text>{text}</Text>;
		}

		const {unmount, rerender, waitUntilExit, waitUntilRenderFlush} = render(
			<Test key={1} value={1} />,
			{
				stdout: options.stdout,
				interactive: true,
				maxFps: 0,
				concurrent: options.concurrent,
			},
		);

		t.after(async () => {
			unmount();
			await waitUntilExit();
		});

		await waitUntilRenderFlush();
		options.writes.length = 0;

		rerender(<Test key={2} value={2} />);
		await waitUntilRenderFlush();

		const renderedOutput = toRenderedOutput(options.writes);
		t.assert.ok(!renderedOutput.includes('before 2'));
		t.assert.ok(renderedOutput.includes('after 2'));
	};

const assertStaticOutputFromEarlyDeferredPassSurvivesLaterPassesWithoutNewStaticOutput =
	async (
		t: TestContext,
		options: {
			readonly stdout: NodeJS.WriteStream;
			readonly writes: string[];
			readonly concurrent?: boolean;
		},
	) => {
		function Test() {
			const [step, setStep] = useState(0);

			useLayoutEffect(() => {
				if (step < 2) {
					setStep(previousStep => previousStep + 1);
				}
			}, [step]);

			return (
				<>
					<Static items={['static once']}>
						{item => <Text key={item}>{item}</Text>}
					</Static>
					<Text>{`step ${step}`}</Text>
				</>
			);
		}

		const {unmount, waitUntilExit, waitUntilRenderFlush} = render(<Test />, {
			stdout: options.stdout,
			interactive: true,
			concurrent: options.concurrent,
		});

		t.after(async () => {
			unmount();
			await waitUntilExit();
		});

		await waitUntilRenderFlush();

		const renderedOutput = toRenderedOutput(options.writes);
		t.assert.strictEqual(countOccurrences(renderedOutput, 'static once'), 1);
		t.assert.ok(!renderedOutput.includes('step 0'));
		t.assert.ok(!renderedOutput.includes('step 1'));
		t.assert.ok(renderedOutput.includes('step 2'));
	};

const assertStaticOutputSurvivesWhenFirstPassHasNoInteractiveOutput = async (
	t: TestContext,
	options: {
		readonly stdout: NodeJS.WriteStream;
		readonly writes: string[];
		readonly concurrent?: boolean;
	},
) => {
	function Test() {
		const [isVisible, setIsVisible] = useState(false);

		useLayoutEffect(() => {
			setIsVisible(true);
		}, []);

		return (
			<>
				<Static items={['static first pass']}>
					{item => <Text key={item}>{item}</Text>}
				</Static>
				{isVisible ? <Text>visible</Text> : null}
			</>
		);
	}

	const {unmount, waitUntilExit, waitUntilRenderFlush} = render(<Test />, {
		stdout: options.stdout,
		interactive: true,
		concurrent: options.concurrent,
	});

	t.after(async () => {
		unmount();
		await waitUntilExit();
	});

	await waitUntilRenderFlush();

	const renderedOutput = toRenderedOutput(options.writes);
	t.assert.strictEqual(
		countOccurrences(renderedOutput, 'static first pass'),
		1,
	);
	t.assert.ok(renderedOutput.includes('visible'));
};

const assertMultipleWaitUntilRenderFlushWaitersResolveOnInitialDeferredLayoutCommitWhenThrottled =
	async (
		t: TestContext,
		options: {
			readonly stdout: NodeJS.WriteStream;
			readonly writes: string[];
			readonly concurrent?: boolean;
		},
	) => {
		function Test() {
			const [text, setText] = useState('before');

			useLayoutEffect(() => {
				setText('after');
			}, []);

			return <Text>{text}</Text>;
		}

		const {unmount, waitUntilExit, waitUntilRenderFlush} = render(<Test />, {
			stdout: options.stdout,
			interactive: true,
			maxFps: 1,
			concurrent: options.concurrent,
		});

		t.after(async () => {
			unmount();
			await waitUntilExit();
		});

		await Promise.all([
			waitUntilRenderFlush(),
			waitUntilRenderFlush(),
			waitUntilRenderFlush(),
		]);

		const renderedOutput = toRenderedOutput(options.writes);
		t.assert.ok(!renderedOutput.includes('before'));
		t.assert.ok(renderedOutput.includes('after'));
	};

const assertThrottledMountUseEffectWithStaticAvoidsStaticDuplication = async (
	t: TestContext,
	options: {
		readonly stdout: NodeJS.WriteStream;
		readonly writes: string[];
		readonly concurrent?: boolean;
	},
) => {
	function Test() {
		const [text, setText] = useState('first frame');

		useEffect(() => {
			setText('after useEffect');
		}, []);

		return (
			<>
				<Static items={['static once']}>
					{item => <Text key={item}>{item}</Text>}
				</Static>
				<Text>{text}</Text>
			</>
		);
	}

	const {unmount, waitUntilExit, waitUntilRenderFlush} = render(<Test />, {
		stdout: options.stdout,
		interactive: true,
		maxFps: 1,
		concurrent: options.concurrent,
	});

	t.after(async () => {
		unmount();
		await waitUntilExit();
	});

	await waitUntilRenderFlush();
	await waitUntilRenderFlush();

	const renderedOutput = toRenderedOutput(options.writes);

	t.assert.strictEqual(countOccurrences(renderedOutput, 'static once'), 1);
	t.assert.ok(renderedOutput.includes('after useEffect'));
};

const assertThrottledMountUseEffectMultipleQueuedUpdatesKeepsFirstFrameAndFinalValue =
	async (
		t: TestContext,
		options: {
			readonly stdout: NodeJS.WriteStream;
			readonly writes: string[];
			readonly concurrent?: boolean;
		},
	) => {
		function Test() {
			const [text, setText] = useState('first frame');

			useEffect(() => {
				setText('middle');
				setText('after useEffect');
			}, []);

			return <Text>{text}</Text>;
		}

		const {unmount, waitUntilExit, waitUntilRenderFlush} = render(<Test />, {
			stdout: options.stdout,
			interactive: true,
			maxFps: 1,
			concurrent: options.concurrent,
		});

		t.after(async () => {
			unmount();
			await waitUntilExit();
		});

		await waitUntilRenderFlush();
		await waitUntilRenderFlush();

		const renderedOutput = toRenderedOutput(options.writes);
		const firstFrameIndex = renderedOutput.indexOf('first frame');
		const afterUseEffectIndex = renderedOutput.indexOf('after useEffect');

		t.assert.ok(firstFrameIndex !== -1);
		t.assert.ok(afterUseEffectIndex !== -1);
		t.assert.ok(firstFrameIndex < afterUseEffectIndex);
		t.assert.ok(!renderedOutput.includes('middle'));
	};

const assertThrottledMountUseEffectQueuedStaticGrowthPreservesStaticOutputAndFinalValue =
	async (
		t: TestContext,
		options: {
			readonly stdout: NodeJS.WriteStream;
			readonly writes: string[];
			readonly concurrent?: boolean;
		},
	) => {
		function Test() {
			const [step, setStep] = useState(0);

			useEffect(() => {
				setStep(1);
				setStep(2);
			}, []);

			const items = Array.from(
				{length: step + 1},
				(_value, itemIndex) => `static ${itemIndex}`,
			);

			return (
				<>
					<Static items={items}>
						{item => <Text key={item}>{item}</Text>}
					</Static>
					<Text>{`step ${step}`}</Text>
				</>
			);
		}

		const {unmount, waitUntilExit, waitUntilRenderFlush} = render(<Test />, {
			stdout: options.stdout,
			interactive: true,
			maxFps: 1,
			concurrent: options.concurrent,
		});

		t.after(async () => {
			unmount();
			await waitUntilExit();
		});

		await waitUntilRenderFlush();
		await waitUntilRenderFlush();

		const renderedOutput = toRenderedOutput(options.writes);
		const firstFrameIndex = renderedOutput.indexOf('step 0');
		const finalFrameIndex = renderedOutput.indexOf('step 2');

		t.assert.strictEqual(countOccurrences(renderedOutput, 'static 0'), 1);
		t.assert.strictEqual(countOccurrences(renderedOutput, 'static 1'), 1);
		t.assert.strictEqual(countOccurrences(renderedOutput, 'static 2'), 1);
		t.assert.ok(finalFrameIndex !== -1);
		if (firstFrameIndex !== -1) {
			t.assert.ok(firstFrameIndex < finalFrameIndex);
		}

		t.assert.ok(!renderedOutput.includes('step 1'));
	};

type Issue773RenderAssertionOptions = {
	readonly stdout: NodeJS.WriteStream;
	readonly writes: string[];
	readonly concurrent?: boolean;
};

type Issue773RenderAssertion = (
	t: TestContext,
	options: Issue773RenderAssertionOptions,
) => Promise<void>;

type Issue773StreamVariant = {
	readonly titleSuffix: string;
	readonly createCapturedWritable: () => {
		readonly stdout: NodeJS.WriteStream;
		readonly writes: string[];
	};
};

type Issue773ConcurrentVariant = {
	readonly titleSuffix: string;
	readonly concurrent?: true;
};

const issue773StreamVariants: Issue773StreamVariant[] = [
	{
		titleSuffix: '',
		createCapturedWritable: () => createCapturedWritableTtyStdout(),
	},
];

const issue773ConcurrentVariants: Issue773ConcurrentVariant[] = [
	{
		titleSuffix: '',
	},
	{
		titleSuffix: ' in concurrent mode',
		concurrent: true,
	},
];

const defineIssue773MatrixTests = ({
	titleBase,
	assertTest,
}: {
	readonly titleBase: string;
	readonly assertTest: Issue773RenderAssertion;
}): void => {
	for (const streamVariant of issue773StreamVariants) {
		for (const concurrentVariant of issue773ConcurrentVariants) {
			// eslint-disable-next-line node-test/require-assertion
			test(`issue 773: ${titleBase}${streamVariant.titleSuffix}${concurrentVariant.titleSuffix}`, async (t: TestContext) => {
				const {stdout, writes} = streamVariant.createCapturedWritable();
				await assertTest(t, {
					stdout,
					interactive: true,
					writes,
					concurrent: concurrentVariant.concurrent,
				});
			});
		}
	}
};

defineIssue773MatrixTests({
	titleBase: 'mount useEffect update should not suppress the first frame',
	assertTest: assertMountUseEffectUpdateRendersInitialFrame,
});

defineIssue773MatrixTests({
	titleBase:
		'mount useLayoutEffect and useEffect updates should coalesce to latest output',
	assertTest: assertMountLayoutAndUseEffectCoalesceToLatestOutput,
});

defineIssue773MatrixTests({
	titleBase:
		'mount useEffect update should not suppress the first frame when rendering is throttled',
	assertTest:
		assertMountUseEffectUpdateRendersInitialFrameWhenRenderingIsThrottled,
});

defineIssue773MatrixTests({
	titleBase:
		'waitUntilRenderFlush should include first-frame layout effect update when rendering is throttled',
	assertTest:
		assertWaitUntilRenderFlushIncludesFirstFrameLayoutEffectUpdateWhenRenderingIsThrottled,
});

defineIssue773MatrixTests({
	titleBase: 'mount useEffect updates should not duplicate Static output',
	assertTest: assertMountUseEffectStaticOutputIsNotDuplicated,
});

defineIssue773MatrixTests({
	titleBase:
		'throttled layout and effect coalescing should preserve Static output and final value',
	assertTest:
		assertThrottledMountLayoutAndUseEffectCoalescingPreservesStaticOutput,
});

defineIssue773MatrixTests({
	titleBase:
		'deferred layout coalescing should still work after later empty output',
	assertTest: assertDeferredLayoutCoalescingStillWorksAfterLaterEmptyOutput,
});

defineIssue773MatrixTests({
	titleBase:
		'subsequent mounted layout effects should not render intermediate frames',
	assertTest:
		assertSubsequentMountLayoutEffectUpdatesDoNotRenderIntermediateFrames,
});

defineIssue773MatrixTests({
	titleBase:
		'static output from early deferred pass should survive later passes without new static output',
	assertTest:
		assertStaticOutputFromEarlyDeferredPassSurvivesLaterPassesWithoutNewStaticOutput,
});

defineIssue773MatrixTests({
	titleBase:
		'static output should survive when first pass has no interactive output',
	assertTest: assertStaticOutputSurvivesWhenFirstPassHasNoInteractiveOutput,
});

defineIssue773MatrixTests({
	titleBase:
		'multiple waitUntilRenderFlush waiters should resolve on the initial throttled deferred layout commit',
	assertTest:
		assertMultipleWaitUntilRenderFlushWaitersResolveOnInitialDeferredLayoutCommitWhenThrottled,
});

defineIssue773MatrixTests({
	titleBase:
		'throttled mount useEffect with Static should avoid Static duplication',
	assertTest: assertThrottledMountUseEffectWithStaticAvoidsStaticDuplication,
});

defineIssue773MatrixTests({
	titleBase:
		'throttled mount useEffect with multiple queued updates should preserve first frame and only render final effect value',
	assertTest:
		assertThrottledMountUseEffectMultipleQueuedUpdatesKeepsFirstFrameAndFinalValue,
});

defineIssue773MatrixTests({
	titleBase:
		'throttled mount useEffect static growth with queued updates should preserve all Static output and final value',
	assertTest:
		assertThrottledMountUseEffectQueuedStaticGrowthPreservesStaticOutputAndFinalValue,
});

test('issue 773: useLayoutEffect should not render an intermediate frame', async (t: TestContext) => {
	const {stdout, writes} = createCapturedWritableTtyStdout();

	function Test() {
		const [text, setText] = useState('before');

		useLayoutEffect(() => {
			setText('after');
		}, []);

		return <Text>{text}</Text>;
	}

	const {unmount, waitUntilExit, waitUntilRenderFlush} = render(<Test />, {
		stdout,
		interactive: true,
	});

	t.after(async () => {
		unmount();
		await waitUntilExit();
	});

	await waitUntilRenderFlush();

	const renderedOutput = toRenderedOutput(writes);

	t.assert.ok(!renderedOutput.includes('before'));
	t.assert.ok(renderedOutput.includes('after'));
});

test('issue 773: useLayoutEffect should not render an intermediate frame in concurrent mode', async (t: TestContext) => {
	const {stdout, writes} = createCapturedWritableTtyStdout();

	function Test() {
		const [text, setText] = useState('before');

		useLayoutEffect(() => {
			setText('after');
		}, []);

		return <Text>{text}</Text>;
	}

	const {unmount, waitUntilExit, waitUntilRenderFlush} = render(<Test />, {
		stdout,
		interactive: true,
		concurrent: true,
	});

	t.after(async () => {
		unmount();
		await waitUntilExit();
	});

	await waitUntilRenderFlush();

	const renderedOutput = toRenderedOutput(writes);

	t.assert.ok(!renderedOutput.includes('before'));
	t.assert.ok(renderedOutput.includes('after'));
});

test('issue 773: useLayoutEffect coalescing should preserve Static output', async (t: TestContext) => {
	const {stdout, writes} = createCapturedWritableTtyStdout();

	function Test() {
		const [text, setText] = useState('before');

		useLayoutEffect(() => {
			setText('after');
		}, []);

		return (
			<>
				<Static items={['static line']}>
					{item => <Text key={item}>{item}</Text>}
				</Static>
				<Text>{text}</Text>
			</>
		);
	}

	const {unmount, waitUntilExit, waitUntilRenderFlush} = render(<Test />, {
		stdout,
		interactive: true,
		concurrent: true,
	});

	t.after(async () => {
		unmount();
		await waitUntilExit();
	});

	await waitUntilRenderFlush();

	const renderedOutput = toRenderedOutput(writes);

	t.assert.strictEqual(countOccurrences(renderedOutput, 'static line'), 1);
	t.assert.ok(!renderedOutput.includes('before'));
	t.assert.ok(renderedOutput.includes('after'));
});

test('issue 773: useLayoutEffect should only render the final value when multiple updates are queued', async (t: TestContext) => {
	const {stdout, writes} = createCapturedWritableTtyStdout();

	function Test() {
		const [text, setText] = useState('before');

		useLayoutEffect(() => {
			setText('middle');
			setText('after');
		}, []);

		return <Text>{text}</Text>;
	}

	const {unmount, waitUntilExit, waitUntilRenderFlush} = render(<Test />, {
		stdout,
		interactive: true,
	});

	t.after(async () => {
		unmount();
		await waitUntilExit();
	});

	await waitUntilRenderFlush();

	const renderedOutput = toRenderedOutput(writes);

	t.assert.ok(!renderedOutput.includes('before'));
	t.assert.ok(!renderedOutput.includes('middle'));
	t.assert.ok(renderedOutput.includes('after'));
});

test('issue 773: useLayoutEffect coalescing should preserve all Static output across multiple passes', async (t: TestContext) => {
	const {stdout, writes} = createCapturedWritableTtyStdout();

	function Test() {
		const [step, setStep] = useState(0);

		useLayoutEffect(() => {
			if (step < 2) {
				setStep(previousStep => previousStep + 1);
			}
		}, [step]);

		const items = Array.from(
			{length: step + 1},
			(_value, itemIndex) => `static ${itemIndex}`,
		);

		return (
			<>
				<Static items={items}>{item => <Text key={item}>{item}</Text>}</Static>
				<Text>{`step ${step}`}</Text>
			</>
		);
	}

	const {unmount, waitUntilExit, waitUntilRenderFlush} = render(<Test />, {
		stdout,
		interactive: true,
		concurrent: true,
	});

	t.after(async () => {
		unmount();
		await waitUntilExit();
	});

	await waitUntilRenderFlush();

	const renderedOutput = toRenderedOutput(writes);

	t.assert.strictEqual(countOccurrences(renderedOutput, 'static 0'), 1);
	t.assert.strictEqual(countOccurrences(renderedOutput, 'static 1'), 1);
	t.assert.strictEqual(countOccurrences(renderedOutput, 'static 2'), 1);
	t.assert.ok(!renderedOutput.includes('step 0'));
	t.assert.ok(!renderedOutput.includes('step 1'));
	t.assert.ok(renderedOutput.includes('step 2'));
});

test('issue 773: useLayoutEffect coalescing should preserve all Static output across multiple passes in legacy mode', async (t: TestContext) => {
	const {stdout, writes} = createCapturedWritableTtyStdout();

	function Test() {
		const [step, setStep] = useState(0);

		useLayoutEffect(() => {
			if (step < 2) {
				setStep(previousStep => previousStep + 1);
			}
		}, [step]);

		const items = Array.from(
			{length: step + 1},
			(_value, itemIndex) => `static ${itemIndex}`,
		);

		return (
			<>
				<Static items={items}>{item => <Text key={item}>{item}</Text>}</Static>
				<Text>{`step ${step}`}</Text>
			</>
		);
	}

	const {unmount, waitUntilExit, waitUntilRenderFlush} = render(<Test />, {
		stdout,
		interactive: true,
	});

	t.after(async () => {
		unmount();
		await waitUntilExit();
	});

	await waitUntilRenderFlush();

	const renderedOutput = toRenderedOutput(writes);

	t.assert.strictEqual(countOccurrences(renderedOutput, 'static 0'), 1);
	t.assert.strictEqual(countOccurrences(renderedOutput, 'static 1'), 1);
	t.assert.strictEqual(countOccurrences(renderedOutput, 'static 2'), 1);
	t.assert.ok(!renderedOutput.includes('step 0'));
	t.assert.ok(!renderedOutput.includes('step 1'));
	t.assert.ok(renderedOutput.includes('step 2'));
});

test('issue 773: nested layout effect updates should not render intermediate frames', async (t: TestContext) => {
	const {stdout, writes} = createCapturedWritableTtyStdout();

	function Child() {
		const [text, setText] = useState('child before');

		useLayoutEffect(() => {
			setText('child after');
		}, []);

		return <Text>{text}</Text>;
	}

	function Test() {
		const [text, setText] = useState('parent before');

		useLayoutEffect(() => {
			setText('parent after');
		}, []);

		return (
			<>
				<Text>{text}</Text>
				<Child />
			</>
		);
	}

	const {unmount, waitUntilExit, waitUntilRenderFlush} = render(<Test />, {
		stdout,
		interactive: true,
	});

	t.after(async () => {
		unmount();
		await waitUntilExit();
	});

	await waitUntilRenderFlush();

	const renderedOutput = toRenderedOutput(writes);

	t.assert.ok(!renderedOutput.includes('parent before'));
	t.assert.ok(!renderedOutput.includes('child before'));
	t.assert.ok(renderedOutput.includes('parent after'));
	t.assert.ok(renderedOutput.includes('child after'));
});

test('issue 773: nested layout effect updates should not render intermediate frames in concurrent mode', async (t: TestContext) => {
	const {stdout, writes} = createCapturedWritableTtyStdout();

	function Child() {
		const [text, setText] = useState('child before');

		useLayoutEffect(() => {
			setText('child after');
		}, []);

		return <Text>{text}</Text>;
	}

	function Test() {
		const [text, setText] = useState('parent before');

		useLayoutEffect(() => {
			setText('parent after');
		}, []);

		return (
			<>
				<Text>{text}</Text>
				<Child />
			</>
		);
	}

	const {unmount, waitUntilExit, waitUntilRenderFlush} = render(<Test />, {
		stdout,
		interactive: true,
		concurrent: true,
	});

	t.after(async () => {
		unmount();
		await waitUntilExit();
	});

	await waitUntilRenderFlush();

	const renderedOutput = toRenderedOutput(writes);

	t.assert.ok(!renderedOutput.includes('parent before'));
	t.assert.ok(!renderedOutput.includes('child before'));
	t.assert.ok(renderedOutput.includes('parent after'));
	t.assert.ok(renderedOutput.includes('child after'));
});
test('issue 773: nested layout updates with static coalescing should preserve static output', async (t: TestContext) => {
	const {stdout, writes} = createCapturedWritableTtyStdout();

	function Child() {
		const [text, setText] = useState('child before');

		useLayoutEffect(() => {
			setText('child after');
		}, []);

		return <Text>{text}</Text>;
	}

	function Test() {
		const [step, setStep] = useState(0);

		useLayoutEffect(() => {
			if (step < 1) {
				setStep(previousStep => previousStep + 1);
			}
		}, [step]);

		const items = Array.from(
			{length: step + 1},
			(_value, itemIndex) => `static ${itemIndex}`,
		);

		return (
			<>
				<Static items={items}>{item => <Text key={item}>{item}</Text>}</Static>
				<Text>{`step ${step}`}</Text>
				<Child />
			</>
		);
	}

	const {unmount, waitUntilExit, waitUntilRenderFlush} = render(<Test />, {
		stdout,
		interactive: true,
		concurrent: true,
	});

	t.after(async () => {
		unmount();
		await waitUntilExit();
	});

	await waitUntilRenderFlush();

	const renderedOutput = toRenderedOutput(writes);

	t.assert.strictEqual(countOccurrences(renderedOutput, 'static 0'), 1);
	t.assert.strictEqual(countOccurrences(renderedOutput, 'static 1'), 1);
	t.assert.ok(!renderedOutput.includes('step 0'));
	t.assert.ok(renderedOutput.includes('step 1'));
	t.assert.ok(!renderedOutput.includes('child before'));
	t.assert.ok(renderedOutput.includes('child after'));
});

test('issue 773: useStdout.write during mount should preserve static output and final layout effect output', async (t: TestContext) => {
	const {stdout, writes} = createCapturedWritableTtyStdout();

	function Test() {
		const {write} = useStdout();
		const [text, setText] = useState('before');

		useLayoutEffect(() => {
			setText('after');
		}, []);

		useEffect(() => {
			write('external line\n');
		}, [write]);

		return (
			<>
				<Static items={['static line']}>
					{item => <Text key={item}>{item}</Text>}
				</Static>
				<Text>{text}</Text>
			</>
		);
	}

	const {unmount, waitUntilExit, waitUntilRenderFlush} = render(<Test />, {
		stdout,
		interactive: true,
	});

	t.after(async () => {
		unmount();
		await waitUntilExit();
	});

	await waitUntilRenderFlush();

	const renderedOutput = toRenderedOutput(writes);

	t.assert.ok(renderedOutput.includes('external line'));
	t.assert.strictEqual(countOccurrences(renderedOutput, 'static line'), 1);
	t.assert.ok(renderedOutput.includes('after'));
});

test('issue 773: useStderr.write during mount should preserve static output and final layout effect output', async (t: TestContext) => {
	const {stdout, writes} = createCapturedWritableTtyStdout();
	const stderrWrites: string[] = [];
	const stderr = new Writable({
		write(
			chunk: string | Uint8Array,
			_encoding: BufferEncoding,
			callback: (error?: Error) => void,
		) {
			stderrWrites.push(typeof chunk === 'string' ? chunk : chunk.toString());
			callback();
		},
	}) as unknown as NodeJS.WriteStream;

	function Test() {
		const {write} = useStderr();
		const [text, setText] = useState('before');

		useLayoutEffect(() => {
			setText('after');
		}, []);

		useEffect(() => {
			write('external error line\n');
		}, [write]);

		return (
			<>
				<Static items={['static line']}>
					{item => <Text key={item}>{item}</Text>}
				</Static>
				<Text>{text}</Text>
			</>
		);
	}

	const {unmount, waitUntilExit, waitUntilRenderFlush} = render(<Test />, {
		stdout,
		interactive: true,
		stderr,
	});

	t.after(async () => {
		unmount();
		await waitUntilExit();
	});

	await waitUntilRenderFlush();

	const renderedStdoutOutput = toRenderedOutput(writes);
	const renderedStderrOutput = toRenderedOutput(stderrWrites);

	t.assert.ok(renderedStderrOutput.includes('external error line'));
	t.assert.ok(!renderedStdoutOutput.includes('external error line'));
	t.assert.strictEqual(
		countOccurrences(renderedStdoutOutput, 'static line'),
		1,
	);
	t.assert.ok(renderedStdoutOutput.includes('after'));
});

test('issue 773: throttled mount useEffect update should not suppress first frame when first write callback is delayed', async (t: TestContext) => {
	let didInitialWriteCallbackFire = false;
	let didUseEffectRun = false;
	let releaseInitialWriteCallback: (() => void) | undefined;
	const writes: Array<string | Uint8Array> = [];
	const stdout = new Writable({
		write(
			chunk: string | Uint8Array,
			_encoding: BufferEncoding,
			callback: (error?: Error) => void,
		) {
			writes.push(chunk);

			if (!releaseInitialWriteCallback && !isWriteBarrierChunk(chunk)) {
				releaseInitialWriteCallback = () => {
					didInitialWriteCallbackFire = true;
					callback();
				};

				return;
			}

			callback();
		},
	}) as unknown as NodeJS.WriteStream;
	stdout.rows = 24;
	stdout.isTTY = true;
	stdout.columns = 100;
	const {promise: useEffectDidRun, resolve: resolveUseEffectRun} =
		Promise.withResolvers<void>();

	function Test() {
		const [text, setText] = useState('first frame');

		useEffect(() => {
			didUseEffectRun = true;
			resolveUseEffectRun();
			setText('after useEffect');
		}, []);

		return <Text>{text}</Text>;
	}

	const {unmount, waitUntilExit, waitUntilRenderFlush} = render(<Test />, {
		stdout,
		interactive: true,
		maxFps: 1,
	});

	t.after(async () => {
		unmount();
		await waitUntilExit();
	});

	await useEffectDidRun;
	t.assert.ok(didUseEffectRun);
	t.assert.ok(!didInitialWriteCallbackFire);
	if (!releaseInitialWriteCallback) {
		t.assert.fail('Expected initial write callback release to be available');
		return;
	}

	releaseInitialWriteCallback();

	await waitUntilRenderFlush();
	await waitUntilRenderFlush();

	const renderedOutput = toRenderedOutput(writes);
	const firstFrameIndex = renderedOutput.indexOf('first frame');
	const afterUseEffectIndex = renderedOutput.indexOf('after useEffect');

	t.assert.notStrictEqual(firstFrameIndex, -1);
	t.assert.notStrictEqual(afterUseEffectIndex, -1);
	t.assert.ok(firstFrameIndex < afterUseEffectIndex);
});

// The tests below cover when the frame is painted: as `render()` returns, and one microtask after any other commit.

// Scheduler keeps the real `setImmediate` it captured at load, so wait on that one while a fake clock is installed.
const realSetImmediate = setImmediate;

const frameWritesSince = (stdout: FakeStdout, index: number): string[] =>
	stdout
		.getWrites()
		.slice(index)
		.map(write => stripAnsi(write))
		.filter(write => write.trim() !== '');

const withFakeClock = async (
	run: (clock: ReturnType<typeof FakeTimers.install>) => void | Promise<void>,
) => {
	// `node:test` reports results through `process.nextTick`, so faking it silently drops the results of later tests in this file.
	const clock = FakeTimers.install({toNotFake: ['nextTick']});
	try {
		await run(clock);
	} finally {
		clock.uninstall();
	}
};

for (const {name, hook, chunk} of [
	{name: 'useInput', hook: useInput, chunk: 'a'},
	{name: 'usePaste', hook: usePaste, chunk: '\u{1B}[200~a\u{1B}[201~'},
] as const) {
	test(`issue 773: a layout effect update after ${name} is painted once`, async (t: TestContext) => {
		await withFakeClock(async clock => {
			const stdout = createStdout();
			const stdin = createStdin();

			function Test() {
				const [count, setCount] = useState(0);
				const [measured, setMeasured] = useState(0);

				hook(() => {
					setCount(previous => previous + 1);
				});

				useLayoutEffect(() => {
					setMeasured(count);
				}, [count]);

				return (
					<Text>
						count={count} measured={measured}
					</Text>
				);
			}

			const {unmount} = render(<Test />, {stdout, stdin, interactive: true});
			try {
				// Leave the throttle window of the first frame.
				clock.tick(1000);
				const startedAt = stdout.getWrites().length;

				emitReadable(stdin, chunk);
				// React flushes the update in a microtask and Ink paints in the next one.
				await Promise.resolve();
				await Promise.resolve();

				t.assert.deepStrictEqual(frameWritesSince(stdout, startedAt), [
					'count=1 measured=1\n',
				]);
			} finally {
				unmount();
			}
		});
	});
}

test('issue 773: a layout effect update after a timer is painted once', async (t: TestContext) => {
	await withFakeClock(async clock => {
		const stdout = createStdout();

		function Test() {
			const [count, setCount] = useState(0);
			const [measured, setMeasured] = useState(0);

			useEffect(() => {
				const timer = setTimeout(() => {
					setCount(1);
				}, 100);

				return () => {
					clearTimeout(timer);
				};
			}, []);

			useLayoutEffect(() => {
				setMeasured(count);
			}, [count]);

			return (
				<Text>
					count={count} measured={measured}
				</Text>
			);
		}

		const {unmount} = render(<Test />, {stdout, interactive: true});
		try {
			const startedAt = stdout.getWrites().length;

			clock.tick(1000);
			// React flushes the update in a Scheduler task, and Ink paints in the microtask after it.
			await new Promise(resolve => {
				realSetImmediate(resolve);
			});

			t.assert.deepStrictEqual(frameWritesSince(stdout, startedAt), [
				'count=1 measured=1\n',
			]);
		} finally {
			unmount();
		}
	});
});

test('issue 773: the frame is on stdout when render() and rerender() return', async (t: TestContext) => {
	await withFakeClock(clock => {
		const stdout = createStdout();

		function Test({label}: {readonly label: string}) {
			const [measured, setMeasured] = useState('');

			useLayoutEffect(() => {
				setMeasured(label);
			}, [label]);

			return (
				<Text>
					{label} measured={measured}
				</Text>
			);
		}

		const {unmount, rerender} = render(<Test label="A" />, {
			stdout,
			interactive: true,
		});
		try {
			t.assert.deepStrictEqual(frameWritesSince(stdout, 0), ['A measured=A\n']);

			clock.tick(1000);
			const startedAt = stdout.getWrites().length;
			rerender(<Test label="B" />);

			t.assert.deepStrictEqual(frameWritesSince(stdout, startedAt), [
				'B measured=B\n',
			]);
		} finally {
			unmount();
		}
	});
});

test('issue 773: frames are written in order when render(), rerender() and unmount() run in one tick', (t: TestContext) => {
	const stdout = createStdout();
	const {unmount, rerender} = render(<Text>A</Text>, {
		stdout,
		interactive: true,
	});

	rerender(<Text>B</Text>);
	unmount();

	t.assert.deepStrictEqual(frameWritesSince(stdout, 0), ['A\n', 'B\n']);
});

test('issue 773: a direct stdout write after render() lands after the frame', (t: TestContext) => {
	const stdout = createStdout();
	const {unmount} = render(<Text>frame</Text>, {stdout, interactive: true});
	t.after(() => {
		unmount();
	});

	stdout.write('direct\n');

	t.assert.deepStrictEqual(frameWritesSince(stdout, 0), [
		'frame\n',
		'direct\n',
	]);
});

test('issue 773: two instances each paint only their settled frame to their own stdout', (t: TestContext) => {
	function Test({label}: {readonly label: string}) {
		const [measured, setMeasured] = useState('');

		useLayoutEffect(() => {
			setMeasured(label);
		}, [label]);

		return (
			<Text>
				{label} measured={measured}
			</Text>
		);
	}

	const firstStdout = createStdout();
	const secondStdout = createStdout();
	const first = render(<Test label="first" />, {
		stdout: firstStdout,
		interactive: true,
	});
	const second = render(<Test label="second" />, {
		stdout: secondStdout,
		interactive: true,
	});
	t.after(() => {
		first.unmount();
		second.unmount();
	});

	t.assert.deepStrictEqual(frameWritesSince(firstStdout, 0), [
		'first measured=first\n',
	]);
	t.assert.deepStrictEqual(frameWritesSince(secondStdout, 0), [
		'second measured=second\n',
	]);
});

test('issue 773: clear() from an effect erases the frame of the commit that ran the effect', async (t: TestContext) => {
	await withFakeClock(clock => {
		const stdout = createStdout();
		let clear = () => {};

		function Test({label}: {readonly label: string}) {
			useEffect(() => {
				if (label === 'B') {
					clear();
				}
			}, [label]);

			return <Text>{label}</Text>;
		}

		const instance = render(<Test label="A" />, {stdout, interactive: true});
		clear = instance.clear;
		try {
			clock.tick(1000);
			const startedAt = stdout.getWrites().length;
			instance.rerender(<Test label="B" />);

			t.assert.deepStrictEqual(frameWritesSince(stdout, startedAt), ['B\n']);
			t.assert.deepStrictEqual(
				reconstructTerminalLines(
					stdout.getWrites().join('').replaceAll('\n', '\r\n'),
					10,
				).filter(Boolean),
				[],
			);
		} finally {
			instance.unmount();
		}
	});
});

// Memoized, so the commit that only changes the label leaves <Static> alone and asks for a throttled paint.
const StaticItems = React.memo(
	({items}: {readonly items: readonly string[]}) => (
		<Static items={[...items]}>{item => <Text key={item}>{item}</Text>}</Static>
	),
);

test('issue 773: a <Static> item added by a layout effect is written when rerender() returns, inside the throttle window', async (t: TestContext) => {
	await withFakeClock(() => {
		const stdout = createStdout();

		function Test({
			label,
			note,
		}: {
			readonly label: string;
			readonly note: string;
		}) {
			const [items, setItems] = useState<string[]>([]);

			useLayoutEffect(() => {
				setItems(previous => [...previous, label]);
			}, [label]);

			return (
				<>
					<StaticItems items={items} />
					<Text>
						live {label} {note}
					</Text>
				</>
			);
		}

		const {unmount, rerender} = render(<Test label="A" note="first" />, {
			stdout,
			interactive: true,
			maxFps: 1,
		});
		try {
			// Use up the leading edge of the throttle, so the next throttled paint has to wait.
			rerender(<Test label="A" note="second" />);
			const startedAt = stdout.getWrites().length;
			rerender(<Test label="B" note="second" />);

			t.assert.deepStrictEqual(frameWritesSince(stdout, startedAt), [
				'B\n',
				'live B second\n',
			]);
		} finally {
			unmount();
		}
	});
});
