import React, {Suspense, act, startTransition} from 'react';
import FakeTimers from '@sinonjs/fake-timers';
import delay from 'delay';
import test from 'ava';
import {render, Text, useAnimation} from '../src/index.js';
import createStdout from './helpers/create-stdout.js';
import mockTimerCalls from './helpers/mock-timer-calls.js';

function AnimatedCounter({interval}: {readonly interval?: number}) {
	const {frame} = useAnimation({interval});
	return <Text>{String(frame)}</Text>;
}

function ConditionalAnimation({
	isActive,
	interval,
}: {
	readonly isActive: boolean;
	readonly interval?: number;
}) {
	const {frame} = useAnimation({interval, isActive});
	return <Text>{String(frame)}</Text>;
}

test('frame increments over time', async t => {
	const stdout = createStdout();
	const {unmount} = render(<AnimatedCounter interval={50} />, {
		stdout,
		debug: true,
	});

	await delay(20);
	t.is((stdout.write as any).lastCall.args[0], '0');

	await delay(80);
	const frame = Number.parseInt(
		(stdout.write as any).lastCall.args[0] as string,
		10,
	);
	t.true(frame >= 1);
	unmount();
});

test('does not update when isActive is false', async t => {
	const stdout = createStdout();
	const {unmount} = render(
		<ConditionalAnimation isActive={false} interval={50} />,
		{
			stdout,
			debug: true,
		},
	);

	await delay(20);
	t.is((stdout.write as any).lastCall.args[0], '0');

	await delay(120);
	t.is((stdout.write as any).lastCall.args[0], '0');
	unmount();
});

test('multiple animations with the same interval stay in sync', async t => {
	function MultiSpinner() {
		const {frame: frame1} = useAnimation({interval: 50});
		const {frame: frame2} = useAnimation({interval: 50});
		return (
			<Text>
				{String(frame1)},{String(frame2)}
			</Text>
		);
	}

	const stdout = createStdout();
	const {unmount} = render(<MultiSpinner />, {
		stdout,
		debug: true,
	});

	await delay(20);
	t.is((stdout.write as any).lastCall.args[0], '0,0');

	await delay(100);
	const output = (stdout.write as any).lastCall.args[0] as string;
	const [a, b] = output.split(',').map(Number);
	// Both frames should be equal since they use the same interval.
	t.is(a, b);
	t.true(a! >= 1);
	unmount();
});

test.serial(
	'multiple animations with the same interval share one timer',
	async t => {
		const clock = FakeTimers.install();
		const mocks = mockTimerCalls();

		try {
			function MultiSpinner() {
				const {frame: frame1} = useAnimation({interval: 50});
				const {frame: frame2} = useAnimation({interval: 50});
				return (
					<Text>
						{String(frame1)},{String(frame2)}
					</Text>
				);
			}

			const stdout = createStdout();
			const {unmount} = render(<MultiSpinner />, {
				stdout,
				debug: true,
			});

			t.true(mocks.setTimeoutCallCount >= 1);
			t.true(mocks.timeoutDelays.every(delay => delay === 50));

			await clock.tickAsync(100);
			const output = (stdout.write as any).lastCall.args[0] as string;
			const [frame1, frame2] = output.split(',').map(Number);
			t.is(frame1, frame2);
			t.true(frame1! >= 1);

			unmount();
		} finally {
			mocks.restore();
			clock.uninstall();
		}
	},
);

test.serial(
	'animations with different intervals still use the shared timer',
	async t => {
		const clock = FakeTimers.install();
		const mocks = mockTimerCalls();

		try {
			function MultiSpinner() {
				const {frame: fastFrame} = useAnimation({interval: 50});
				const {frame: slowFrame} = useAnimation({interval: 80});
				return (
					<Text>
						{String(fastFrame)},{String(slowFrame)}
					</Text>
				);
			}

			const stdout = createStdout();
			const {unmount} = render(<MultiSpinner />, {
				stdout,
				debug: true,
			});

			t.true(mocks.timeoutDelays.every(delay => delay >= 50));

			await clock.tickAsync(170);
			const output = (stdout.write as any).lastCall.args[0] as string;
			const [fastFrame, slowFrame] = output.split(',').map(Number);
			t.true(fastFrame! > slowFrame!);

			unmount();
		} finally {
			mocks.restore();
			clock.uninstall();
		}
	},
);

test.serial(
	'shared timer is cleaned up and recreated after the last animation unmounts',
	async t => {
		const clock = FakeTimers.install();
		const mocks = mockTimerCalls();

		try {
			const stdout = createStdout();
			const firstRender = render(<AnimatedCounter interval={50} />, {
				stdout,
				debug: true,
			});

			t.true(mocks.setTimeoutCallCount >= 1);

			firstRender.unmount();
			t.true(mocks.clearTimeoutCallCount >= 1);

			const secondRender = render(<AnimatedCounter interval={50} />, {
				stdout,
				debug: true,
			});

			t.is(mocks.setTimeoutCallCount, 2);

			await clock.tickAsync(120);
			t.true(
				Number.parseInt((stdout.write as any).lastCall.args[0] as string, 10) >=
					1,
			);

			secondRender.unmount();
			t.true(mocks.clearTimeoutCallCount >= 2);
		} finally {
			mocks.restore();
			clock.uninstall();
		}
	},
);

test.serial(
	'shared timer stays alive while another same-interval animation remains mounted',
	async t => {
		const clock = FakeTimers.install();
		const mocks = mockTimerCalls();

		try {
			function AnimationValue() {
				const {frame} = useAnimation({interval: 50});
				return <Text>{String(frame)}</Text>;
			}

			function MaybeDualAnimation({
				showSecond,
			}: {
				readonly showSecond: boolean;
			}) {
				return (
					<>
						<AnimationValue />
						{showSecond ? <Text>,</Text> : undefined}
						{showSecond ? <AnimationValue /> : undefined}
					</>
				);
			}

			const stdout = createStdout();
			const {rerender, unmount} = render(<MaybeDualAnimation showSecond />, {
				stdout,
				debug: true,
			});

			t.true(mocks.setTimeoutCallCount >= 1);

			await clock.tickAsync(120);
			const frameBeforeUnmount = Number.parseInt(
				((stdout.write as any).lastCall.args[0] as string).split(',')[0]!,
				10,
			);
			t.true(frameBeforeUnmount >= 1);

			rerender(<MaybeDualAnimation showSecond={false} />);

			t.true(mocks.setTimeoutCallCount >= 1);
			t.true(mocks.clearTimeoutCallCount >= 1);

			await clock.tickAsync(120);
			const frameAfterUnmount = Number.parseInt(
				(stdout.write as any).lastCall.args[0] as string,
				10,
			);
			t.true(frameAfterUnmount > frameBeforeUnmount);

			unmount();
			t.true(mocks.clearTimeoutCallCount >= 2);
		} finally {
			mocks.restore();
			clock.uninstall();
		}
	},
);

test.serial(
	'shared timer stays alive while another different-interval animation remains mounted',
	async t => {
		const clock = FakeTimers.install();
		const mocks = mockTimerCalls();

		try {
			function AnimationValue({interval}: {readonly interval: number}) {
				const {frame} = useAnimation({interval});
				return <Text>{String(frame)}</Text>;
			}

			function MaybeDualAnimation({
				showSecond,
			}: {
				readonly showSecond: boolean;
			}) {
				return (
					<>
						<AnimationValue interval={50} />
						{showSecond ? <Text>,</Text> : undefined}
						{showSecond ? <AnimationValue interval={80} /> : undefined}
					</>
				);
			}

			const stdout = createStdout();
			const {rerender, unmount} = render(<MaybeDualAnimation showSecond />, {
				stdout,
				debug: true,
			});

			t.true(mocks.setTimeoutCallCount >= 1);

			await clock.tickAsync(120);
			const frameBeforeUnmount = Number.parseInt(
				((stdout.write as any).lastCall.args[0] as string).split(',')[0]!,
				10,
			);
			t.true(frameBeforeUnmount >= 1);

			rerender(<MaybeDualAnimation showSecond={false} />);

			t.true(mocks.setTimeoutCallCount >= 1);
			t.true(mocks.clearTimeoutCallCount >= 1);

			await clock.tickAsync(120);
			const frameAfterUnmount = Number.parseInt(
				(stdout.write as any).lastCall.args[0] as string,
				10,
			);
			t.true(frameAfterUnmount > frameBeforeUnmount);

			unmount();
			t.true(mocks.clearTimeoutCallCount >= 2);
		} finally {
			mocks.restore();
			clock.uninstall();
		}
	},
);

test.serial(
	'inactive animations do not start the shared timer until one becomes active',
	async t => {
		const clock = FakeTimers.install();
		const mocks = mockTimerCalls();

		try {
			function MaybeActiveAnimations({
				isFirstActive,
				isSecondActive,
			}: {
				readonly isFirstActive: boolean;
				readonly isSecondActive: boolean;
			}) {
				const {frame: firstFrame} = useAnimation({
					interval: 50,
					isActive: isFirstActive,
				});
				const {frame: secondFrame} = useAnimation({
					interval: 50,
					isActive: isSecondActive,
				});

				return (
					<Text>
						{String(firstFrame)},{String(secondFrame)}
					</Text>
				);
			}

			const stdout = createStdout();
			const {rerender, unmount} = render(
				<MaybeActiveAnimations isFirstActive={false} isSecondActive={false} />,
				{
					stdout,
					debug: true,
				},
			);

			t.is(mocks.setTimeoutCallCount, 0);

			await clock.tickAsync(100);
			t.is((stdout.write as any).lastCall.args[0], '0,0');

			rerender(<MaybeActiveAnimations isFirstActive isSecondActive={false} />);

			t.is(mocks.setTimeoutCallCount, 1);

			await clock.tickAsync(120);
			const [firstFrame, secondFrame] = (
				(stdout.write as any).lastCall.args[0] as string
			)
				.split(',')
				.map(Number);
			t.true(firstFrame! >= 1);
			t.is(secondFrame, 0);

			unmount();
			t.true(mocks.clearTimeoutCallCount >= 1);
		} finally {
			mocks.restore();
			clock.uninstall();
		}
	},
);

test('cleans up on unmount', async t => {
	const stdout = createStdout();
	const {unmount} = render(<AnimatedCounter interval={50} />, {
		stdout,
		debug: true,
	});

	await delay(80);
	unmount();

	const outputAfterUnmount = (stdout.write as any).lastCall.args[0] as string;
	await delay(120);
	// No new writes should happen after unmount
	t.is((stdout.write as any).lastCall.args[0], outputAfterUnmount);
});

test.serial('no timer leak when all animations are inactive', async t => {
	const clock = FakeTimers.install();
	const mocks = mockTimerCalls();

	try {
		const stdout = createStdout();

		// Mount with isActive=false — no timer should start
		const {rerender, unmount} = render(
			<ConditionalAnimation isActive={false} interval={50} />,
			{stdout, debug: true},
		);

		t.is(mocks.setTimeoutCallCount, 0);

		// Activate — timer should start
		rerender(<ConditionalAnimation isActive interval={50} />);
		t.is(mocks.setTimeoutCallCount, 1);

		await clock.tickAsync(120);
		t.true(
			Number.parseInt((stdout.write as any).lastCall.args[0] as string, 10) >=
				1,
		);

		// Deactivate — subscriber unsubscribes, timer should be cleaned up
		rerender(<ConditionalAnimation isActive={false} interval={50} />);
		t.true(mocks.clearTimeoutCallCount >= 1);

		// Unmount — timer should already be gone
		unmount();
		t.true(mocks.clearTimeoutCallCount >= 1);
	} finally {
		mocks.restore();
		clock.uninstall();
	}
});

test.serial('frame catches up when the shared timer is delayed', async t => {
	const clock = FakeTimers.install();

	try {
		const stdout = createStdout();
		const {unmount} = render(<AnimatedCounter interval={50} />, {
			stdout,
			debug: true,
		});

		await clock.tickAsync(220);
		t.is((stdout.write as any).lastCall.args[0], '4');

		unmount();
	} finally {
		clock.uninstall();
	}
});

test('resets frame when isActive toggles from false to true', async t => {
	const stdout = createStdout();
	const {rerender, unmount} = render(
		<ConditionalAnimation isActive interval={50} />,
		{stdout, debug: true},
	);

	await delay(130);
	const frameBeforePause = Number.parseInt(
		(stdout.write as any).lastCall.args[0] as string,
		10,
	);
	t.true(frameBeforePause >= 1);

	// Pause
	rerender(<ConditionalAnimation isActive={false} interval={50} />);
	await delay(50);

	// Resume - frame should reset to 0
	rerender(<ConditionalAnimation isActive interval={50} />);
	t.is((stdout.write as any).lastCall.args[0], '0');

	// Should start incrementing again
	await delay(120);
	const frameAfterResume = Number.parseInt(
		(stdout.write as any).lastCall.args[0] as string,
		10,
	);
	t.true(frameAfterResume >= 1);
	unmount();
});

test('resets frame when interval changes', async t => {
	function DynamicInterval({interval}: {readonly interval: number}) {
		const {frame} = useAnimation({interval});
		return <Text>{String(frame)}</Text>;
	}

	const stdout = createStdout();
	const {rerender, unmount} = render(<DynamicInterval interval={50} />, {
		stdout,
		debug: true,
	});

	await delay(130);
	const frameBefore = Number.parseInt(
		(stdout.write as any).lastCall.args[0] as string,
		10,
	);
	t.true(frameBefore >= 1);

	// Change interval - frame should reset to 0
	rerender(<DynamicInterval interval={200} />);
	t.is((stdout.write as any).lastCall.args[0], '0');
	unmount();
});

test.serial('time and delta reset to 0 when interval changes', async t => {
	const clock = FakeTimers.install();

	try {
		function DynamicInterval({interval}: {readonly interval: number}) {
			const {frame, time, delta} = useAnimation({interval});
			return (
				<Text>
					{String(frame)},{String(Math.round(time))},{String(Math.round(delta))}
				</Text>
			);
		}

		const stdout = createStdout();
		const {rerender, unmount} = render(<DynamicInterval interval={50} />, {
			stdout,
			debug: true,
			maxFps: 120,
		});

		await clock.tickAsync(200);
		const [frameBefore, timeBefore] = (
			(stdout.write as any).lastCall.args[0] as string
		)
			.split(',')
			.map(Number);
		t.true(frameBefore! >= 1);
		t.true(timeBefore! >= 50);

		// Changing interval should reset frame, time, and delta to 0
		rerender(<DynamicInterval interval={200} />);
		t.is((stdout.write as any).lastCall.args[0], '0,0,0');

		unmount();
	} finally {
		clock.uninstall();
	}
});

test.serial('time and delta reset to 0 when animation is resumed', async t => {
	const clock = FakeTimers.install();

	try {
		function ConditionalDisplay({isActive}: {readonly isActive: boolean}) {
			const {frame, time, delta} = useAnimation({interval: 50, isActive});
			return (
				<Text>
					{String(frame)},{String(Math.round(time))},{String(Math.round(delta))}
				</Text>
			);
		}

		const stdout = createStdout();
		const {rerender, unmount} = render(<ConditionalDisplay isActive />, {
			stdout,
			debug: true,
			maxFps: 120,
		});

		await clock.tickAsync(200);
		const [frameBefore, timeBefore] = (
			(stdout.write as any).lastCall.args[0] as string
		)
			.split(',')
			.map(Number);
		t.true(frameBefore! >= 1);
		t.true(timeBefore! >= 50);

		// Pause then resume — frame, time, and delta should all reset to 0
		rerender(<ConditionalDisplay isActive={false} />);
		rerender(<ConditionalDisplay isActive />);
		t.is((stdout.write as any).lastCall.args[0], '0,0,0');

		unmount();
	} finally {
		clock.uninstall();
	}
});

test('different intervals advance at different rates', async t => {
	function DualAnimation() {
		const {frame: fast} = useAnimation({interval: 50});
		const {frame: slow} = useAnimation({interval: 200});
		return (
			<Text>
				{String(fast)},{String(slow)}
			</Text>
		);
	}

	const stdout = createStdout();
	const {unmount} = render(<DualAnimation />, {
		stdout,
		debug: true,
	});

	await delay(300);
	const output = (stdout.write as any).lastCall.args[0] as string;
	const [fast, slow] = output.split(',').map(Number);
	t.true(fast! > slow!);
	unmount();
});

test.serial('defaults to 100ms interval', async t => {
	const clock = FakeTimers.install();

	try {
		function DefaultInterval() {
			const {frame} = useAnimation();
			return <Text>{String(frame)}</Text>;
		}

		const stdout = createStdout();
		const {unmount} = render(<DefaultInterval />, {
			stdout,
			debug: true,
			maxFps: 120,
		});

		t.is((stdout.write as any).lastCall.args[0], '0');

		await clock.tickAsync(250);

		t.true(
			Number.parseInt((stdout.write as any).lastCall.args[0] as string, 10) >=
				1,
		);

		unmount();
	} finally {
		clock.uninstall();
	}
});

test.serial('treats NaN interval as the default interval', async t => {
	const clock = FakeTimers.install();

	try {
		const stdout = createStdout();
		const {unmount} = render(<AnimatedCounter interval={Number.NaN} />, {
			stdout,
			debug: true,
			maxFps: 120,
		});

		t.is((stdout.write as any).lastCall.args[0], '0');

		await clock.tickAsync(250);

		t.true(
			Number.parseInt((stdout.write as any).lastCall.args[0] as string, 10) >=
				1,
		);

		unmount();
	} finally {
		clock.uninstall();
	}
});

test.serial('treats Infinity interval as the default interval', async t => {
	const clock = FakeTimers.install();

	try {
		const stdout = createStdout();
		const {unmount} = render(
			<AnimatedCounter interval={Number.POSITIVE_INFINITY} />,
			{
				stdout,
				debug: true,
				maxFps: 120,
			},
		);

		t.is((stdout.write as any).lastCall.args[0], '0');

		await clock.tickAsync(250);

		t.true(
			Number.parseInt((stdout.write as any).lastCall.args[0] as string, 10) >=
				1,
		);

		unmount();
	} finally {
		clock.uninstall();
	}
});

test.serial(
	'treats negative Infinity interval as the default interval',
	async t => {
		const clock = FakeTimers.install();

		try {
			const stdout = createStdout();
			const {unmount} = render(
				<AnimatedCounter interval={Number.NEGATIVE_INFINITY} />,
				{
					stdout,
					debug: true,
					maxFps: 120,
				},
			);

			t.is((stdout.write as any).lastCall.args[0], '0');

			await clock.tickAsync(250);

			t.true(
				Number.parseInt((stdout.write as any).lastCall.args[0] as string, 10) >=
					1,
			);

			unmount();
		} finally {
			clock.uninstall();
		}
	},
);

test.serial(
	'clamps oversized finite interval to the timer maximum',
	async t => {
		const clock = FakeTimers.install();

		try {
			const stdout = createStdout();
			const {unmount} = render(
				<AnimatedCounter interval={Number.MAX_SAFE_INTEGER} />,
				{
					stdout,
					debug: true,
					maxFps: 120,
				},
			);

			t.is((stdout.write as any).lastCall.args[0], '0');

			await clock.tickAsync(1000);

			t.is((stdout.write as any).lastCall.args[0], '0');

			unmount();
		} finally {
			clock.uninstall();
		}
	},
);

test.serial('clamps zero interval to 1ms', async t => {
	const clock = FakeTimers.install();

	try {
		const stdout = createStdout();
		const {unmount} = render(<AnimatedCounter interval={0} />, {
			stdout,
			debug: true,
			maxFps: 1000,
		});

		t.is((stdout.write as any).lastCall.args[0], '0');

		await clock.tickAsync(5);

		t.is((stdout.write as any).lastCall.args[0], '5');

		unmount();
	} finally {
		clock.uninstall();
	}
});

test.serial('clamps negative interval to 1ms', async t => {
	const clock = FakeTimers.install();

	try {
		const stdout = createStdout();
		const {unmount} = render(<AnimatedCounter interval={-10} />, {
			stdout,
			debug: true,
			maxFps: 1000,
		});

		t.is((stdout.write as any).lastCall.args[0], '0');

		await clock.tickAsync(5);

		t.is((stdout.write as any).lastCall.args[0], '5');

		unmount();
	} finally {
		clock.uninstall();
	}
});

test.serial('maxFps does not speed up animation state', async t => {
	const clock = FakeTimers.install();

	try {
		const stdout = createStdout();
		const {unmount} = render(<AnimatedCounter interval={8} />, {
			stdout,
			debug: true,
			maxFps: 120,
		});

		t.is((stdout.write as any).lastCall.args[0], '0');

		await clock.tickAsync(25);

		t.is((stdout.write as any).lastCall.args[0], '3');

		unmount();
	} finally {
		clock.uninstall();
	}
});

test.serial('low maxFps caps animation rerenders', async t => {
	const clock = FakeTimers.install();

	try {
		let renderCount = 0;

		function RenderCountingAnimation() {
			renderCount++;
			const {frame} = useAnimation({interval: 10});
			return <Text>{String(frame)}</Text>;
		}

		const stdout = createStdout();
		const {unmount} = render(<RenderCountingAnimation />, {
			stdout,
			maxFps: 1,
		});

		t.is(renderCount, 1);

		await clock.tickAsync(35);

		t.is(renderCount, 1);

		await clock.tickAsync(1000);

		t.true(renderCount >= 2);

		unmount();
	} finally {
		clock.uninstall();
	}
});

test.serial('maxFps 0 does not affect animation cadence', async t => {
	const clock = FakeTimers.install();

	try {
		const stdout = createStdout();
		const {unmount} = render(<AnimatedCounter interval={8} />, {
			stdout,
			debug: true,
			maxFps: 0,
		});

		t.is((stdout.write as any).lastCall.args[0], '0');

		await clock.tickAsync(25);

		t.is((stdout.write as any).lastCall.args[0], '3');

		unmount();
	} finally {
		clock.uninstall();
	}
});

test.serial('delta accounts for throttled ticks', async t => {
	let lastRenderedDelta = 0;

	function DeltaCapture() {
		const {delta} = useAnimation({interval: 20});
		// Captured in the render phase so we can verify the coalesced delta
		// value regardless of when Ink throttles its stdout write.
		lastRenderedDelta = delta;
		return <Text>x</Text>;
	}

	// Deliberately no debug: true — that forces renderThrottleMs = 0 and
	// would prevent the throttle code path from activating.
	// maxFps: 5 → renderThrottleMs = 200ms. Ten 20ms animation ticks fire
	// in the first window, but setAnimState is only called once (at the edge
	// of the 200ms window), so delta reflects ~200ms, not a single 20ms tick.
	const stdout = createStdout();
	const {unmount} = render(<DeltaCapture />, {stdout, maxFps: 5});

	t.is(lastRenderedDelta, 0);

	// Wait well past one full 200ms throttle window.
	await delay(350);

	t.true(
		lastRenderedDelta >= 150,
		`expected delta >= 150ms (one throttle window), got ${lastRenderedDelta}`,
	);

	unmount();
});

test.serial('pausing animation stops ticks before the next frame', async t => {
	const clock = FakeTimers.install();

	try {
		const stdout = createStdout();
		const {rerender, unmount} = render(
			<ConditionalAnimation isActive interval={8} />,
			{
				stdout,
				debug: true,
				maxFps: 120,
			},
		);

		await clock.tickAsync(25);

		const pausedFrame = Number.parseInt(
			(stdout.write as any).lastCall.args[0] as string,
			10,
		);
		t.true(pausedFrame >= 1);

		rerender(<ConditionalAnimation isActive={false} interval={8} />);

		t.is((stdout.write as any).lastCall.args[0], String(pausedFrame));

		await clock.tickAsync(25);

		t.is((stdout.write as any).lastCall.args[0], String(pausedFrame));

		unmount();
	} finally {
		clock.uninstall();
	}
});

test.serial(
	'changing interval unsubscribes stale ticks before reset',
	async t => {
		const clock = FakeTimers.install();

		try {
			function DynamicInterval({interval}: {readonly interval: number}) {
				const {frame} = useAnimation({interval});
				return <Text>{String(frame)}</Text>;
			}

			const stdout = createStdout();
			const {rerender, unmount} = render(<DynamicInterval interval={8} />, {
				stdout,
				debug: true,
				maxFps: 120,
			});

			await clock.tickAsync(25);
			t.true(
				Number.parseInt((stdout.write as any).lastCall.args[0] as string, 10) >=
					1,
			);

			rerender(<DynamicInterval interval={200} />);

			t.is((stdout.write as any).lastCall.args[0], '0');

			await clock.tickAsync(17);

			t.is((stdout.write as any).lastCall.args[0], '0');

			unmount();
		} finally {
			clock.uninstall();
		}
	},
);

test.serial('wall clock changes do not move animations backwards', async t => {
	const clock = FakeTimers.install();
	const originalDateNow = Date.now;
	let wallClockTime = 1000;
	Date.now = () => wallClockTime;

	try {
		const stdout = createStdout();
		const {unmount} = render(<AnimatedCounter interval={8} />, {
			stdout,
			debug: true,
			maxFps: 120,
		});

		wallClockTime = 1024;
		await clock.tickAsync(25);

		const frameBeforeClockJump = Number.parseInt(
			(stdout.write as any).lastCall.args[0] as string,
			10,
		);
		t.true(frameBeforeClockJump >= 1);

		wallClockTime = 900;
		await clock.tickAsync(25);

		t.true(
			Number.parseInt((stdout.write as any).lastCall.args[0] as string, 10) >=
				frameBeforeClockJump,
		);

		unmount();
	} finally {
		Date.now = originalDateNow;
		clock.uninstall();
	}
});

test.serial(
	'animations advance in debug mode when interactive is false',
	async t => {
		const clock = FakeTimers.install();

		try {
			const stdout = createStdout();
			const {unmount} = render(<AnimatedCounter interval={8} />, {
				stdout,
				debug: true,
				interactive: false,
				maxFps: 120,
			});

			t.is((stdout.write as any).lastCall.args[0], '0');

			await clock.tickAsync(25);

			t.true(
				Number.parseInt((stdout.write as any).lastCall.args[0] as string, 10) >=
					1,
			);

			unmount();
		} finally {
			clock.uninstall();
		}
	},
);

test.serial('newly mounted animations do not inherit elapsed time', async t => {
	function AnimatedValue({interval}: {readonly interval: number}) {
		const {frame} = useAnimation({interval});
		return <Text>{String(frame)}</Text>;
	}

	function DelayedDualAnimation() {
		const [showSecond, setShowSecond] = React.useState(false);

		React.useEffect(() => {
			const timer = setTimeout(() => {
				setShowSecond(true);
			}, 20);

			return () => {
				clearTimeout(timer);
			};
		}, []);

		return (
			<>
				<AnimatedValue interval={20} />
				<Text>,</Text>
				{showSecond ? <AnimatedValue interval={20} /> : <Text>-</Text>}
			</>
		);
	}

	const clock = FakeTimers.install();

	try {
		const stdout = createStdout();
		const {unmount} = render(<DelayedDualAnimation />, {
			stdout,
			debug: true,
		});

		const getOutput = () =>
			((stdout.write as any).lastCall.args[0] as string).replaceAll('\n', '');

		await clock.tickAsync(25);

		t.is(getOutput(), '1,0');

		await clock.tickAsync(40);

		const [firstFrame, secondFrame] = getOutput().split(',').map(Number);
		t.true(firstFrame >= 2);
		t.true(secondFrame >= 1);
		t.is(firstFrame - secondFrame, 1);

		unmount();
	} finally {
		clock.uninstall();
	}
});

test.serial(
	'newly activated animations do not inherit elapsed time',
	async t => {
		function AnimatedValue({
			interval,
			isActive = true,
		}: {
			readonly interval: number;
			readonly isActive?: boolean;
		}) {
			const {frame} = useAnimation({interval, isActive});
			return <Text>{String(frame)}</Text>;
		}

		function DelayedActivationAnimation() {
			const [isSecondActive, setIsSecondActive] = React.useState(false);

			React.useEffect(() => {
				const timer = setTimeout(() => {
					setIsSecondActive(true);
				}, 20);

				return () => {
					clearTimeout(timer);
				};
			}, []);

			return (
				<>
					<AnimatedValue interval={20} />
					<Text>,</Text>
					<AnimatedValue interval={20} isActive={isSecondActive} />
				</>
			);
		}

		const clock = FakeTimers.install();

		try {
			const stdout = createStdout();
			const {unmount} = render(<DelayedActivationAnimation />, {
				stdout,
				debug: true,
			});

			const getOutput = () =>
				((stdout.write as any).lastCall.args[0] as string).replaceAll('\n', '');

			await clock.tickAsync(25);

			t.is(getOutput(), '1,0');

			await clock.tickAsync(40);

			const [firstFrame, secondFrame] = getOutput().split(',').map(Number);
			t.true(firstFrame >= 2);
			t.true(secondFrame >= 1);
			t.is(firstFrame - secondFrame, 1);

			unmount();
		} finally {
			clock.uninstall();
		}
	},
);

test.serial(
	'rerendering with the same interval does not reset the frame',
	async t => {
		function DynamicInterval({interval}: {readonly interval: number}) {
			const {frame} = useAnimation({interval});
			return <Text>{String(frame)}</Text>;
		}

		const clock = FakeTimers.install();

		try {
			const stdout = createStdout();
			const {rerender, unmount} = render(<DynamicInterval interval={20} />, {
				stdout,
				debug: true,
				maxFps: 120,
			});

			await clock.tickAsync(50);

			const frameBeforeRerender = Number.parseInt(
				(stdout.write as any).lastCall.args[0] as string,
				10,
			);
			t.true(frameBeforeRerender >= 1);

			rerender(<DynamicInterval interval={20} />);

			t.is((stdout.write as any).lastCall.args[0], String(frameBeforeRerender));

			unmount();
		} finally {
			clock.uninstall();
		}
	},
);

test.serial('time increases with each tick', async t => {
	function TimeDisplay() {
		const {time} = useAnimation({interval: 50});
		return <Text>{String(Math.round(time))}</Text>;
	}

	const stdout = createStdout();
	const {unmount} = render(<TimeDisplay />, {stdout, debug: true});

	t.is((stdout.write as any).lastCall.args[0], '0');

	await delay(80);
	const timeAfterOne = Number.parseInt(
		(stdout.write as any).lastCall.args[0] as string,
		10,
	);
	t.true(timeAfterOne >= 50);

	await delay(80);
	const timeAfterTwo = Number.parseInt(
		(stdout.write as any).lastCall.args[0] as string,
		10,
	);
	t.true(timeAfterTwo > timeAfterOne);

	unmount();
});

test.serial('delta approximates interval on each tick', async t => {
	function DeltaDisplay() {
		const {delta} = useAnimation({interval: 50});
		return <Text>{String(Math.round(delta))}</Text>;
	}

	const stdout = createStdout();
	const {unmount} = render(<DeltaDisplay />, {stdout, debug: true});

	t.is((stdout.write as any).lastCall.args[0], '0');

	await delay(80);
	const deltaAfterFirst = Number.parseInt(
		(stdout.write as any).lastCall.args[0] as string,
		10,
	);
	// First delta should approximate the interval
	t.true(deltaAfterFirst >= 50);

	await delay(80);
	const deltaAfterSecond = Number.parseInt(
		(stdout.write as any).lastCall.args[0] as string,
		10,
	);
	// Subsequent deltas should also approximate the interval
	t.true(deltaAfterSecond >= 50);

	unmount();
});

test.serial('reset() resets frame, time, and delta to 0', async t => {
	const clock = FakeTimers.install();

	try {
		let resetAnimation!: () => void;

		function ResettableAnimation() {
			const {frame, time, delta, reset} = useAnimation({interval: 50});
			resetAnimation = reset;
			return (
				<Text>
					{String(frame)},{String(Math.round(time))},{String(Math.round(delta))}
				</Text>
			);
		}

		const stdout = createStdout();
		const {unmount} = render(<ResettableAnimation />, {
			stdout,
			debug: true,
			maxFps: 120,
		});

		await clock.tickAsync(200);
		const [frameBefore, timeBefore] = (
			(stdout.write as any).lastCall.args[0] as string
		)
			.split(',')
			.map(Number);
		t.true(frameBefore! >= 1);
		t.true(timeBefore! >= 100);

		resetAnimation();

		// Let React flush the state update from reset()
		await clock.tickAsync(1);
		t.is((stdout.write as any).lastCall.args[0], '0,0,0');

		// Confirm it advances again after reset
		await clock.tickAsync(100);
		const [frameAfter, timeAfter, deltaAfter] = (
			(stdout.write as any).lastCall.args[0] as string
		)
			.split(',')
			.map(Number);
		t.true(frameAfter! >= 1);
		t.true(timeAfter! >= 50);
		t.true(deltaAfter! >= 50);
		// Time should be much less than before reset
		t.true(timeAfter! < timeBefore!);

		unmount();
	} finally {
		clock.uninstall();
	}
});

test('reset is a stable function reference', t => {
	const resets: Array<() => void> = [];

	function ResettableAnimation() {
		const {reset} = useAnimation({interval: 50});
		resets.push(reset);
		return <Text>x</Text>;
	}

	const stdout = createStdout();
	const {rerender, unmount} = render(<ResettableAnimation />, {
		stdout,
		debug: true,
	});

	rerender(<ResettableAnimation />);
	rerender(<ResettableAnimation />);

	t.true(resets.length >= 2);
	t.is(resets[0], resets.at(-1));

	unmount();
});

test.serial(
	'reset() while paused takes effect when animation is resumed',
	async t => {
		const clock = FakeTimers.install();

		try {
			let resetAnimation!: () => void;

			function PausableAnimation({isActive}: {readonly isActive: boolean}) {
				const {frame, reset} = useAnimation({interval: 50, isActive});
				resetAnimation = reset;
				return <Text>{String(frame)}</Text>;
			}

			const stdout = createStdout();
			const {rerender, unmount} = render(<PausableAnimation isActive />, {
				stdout,
				debug: true,
				maxFps: 120,
			});

			// Let a few frames accumulate
			await clock.tickAsync(200);
			t.true(
				Number.parseInt((stdout.write as any).lastCall.args[0] as string, 10) >=
					1,
			);

			// Pause the animation
			rerender(<PausableAnimation isActive={false} />);

			// Call reset while paused — frame should remain at current value
			// (the effect hasn't rerun yet because isActive is false)
			resetAnimation();
			await clock.tickAsync(1);
			t.not((stdout.write as any).lastCall.args[0], '-1');

			// Resume — the pending reset should now take effect and frame should be 0
			rerender(<PausableAnimation isActive />);
			t.is((stdout.write as any).lastCall.args[0], '0');

			// And then advance again to confirm animation restarts cleanly
			await clock.tickAsync(100);
			t.true(
				Number.parseInt((stdout.write as any).lastCall.args[0] as string, 10) >=
					1,
			);

			unmount();
		} finally {
			clock.uninstall();
		}
	},
);

test.serial(
	'concurrent aborted renders do not suppress interval reset',
	async t => {
		let resolveSuspense!: () => void;
		const suspendedRender = new Promise<void>(resolve => {
			resolveSuspense = resolve;
		});

		function MaybeSuspendingAnimation({
			interval,
			shouldSuspend,
		}: {
			readonly interval: number;
			readonly shouldSuspend: boolean;
		}) {
			const {frame} = useAnimation({interval});

			if (shouldSuspend) {
				// eslint-disable-next-line @typescript-eslint/only-throw-error
				throw suspendedRender;
			}

			return <Text>{String(frame)}</Text>;
		}

		const stdout = createStdout();
		let instance: ReturnType<typeof render> | undefined;

		try {
			await act(async () => {
				instance = render(
					<Suspense fallback={<Text>loading</Text>}>
						<MaybeSuspendingAnimation interval={50} shouldSuspend={false} />
					</Suspense>,
					{stdout, debug: true, concurrent: true},
				);
			});

			await delay(130);

			const frameBefore = Number.parseInt(stdout.get(), 10);
			t.true(frameBefore >= 1);

			await act(async () => {
				instance!.rerender(
					<Suspense fallback={<Text>loading</Text>}>
						<MaybeSuspendingAnimation shouldSuspend interval={200} />
					</Suspense>,
				);
			});

			t.is(stdout.get(), 'loading');

			await act(async () => {
				instance!.rerender(
					<Suspense fallback={<Text>loading</Text>}>
						<MaybeSuspendingAnimation interval={200} shouldSuspend={false} />
					</Suspense>,
				);
			});

			t.is(stdout.get(), '0');

			await delay(260);
			t.true(Number.parseInt(stdout.get(), 10) >= 1);
		} finally {
			resolveSuspense();
			instance?.unmount();
		}
	},
);

test.serial('unmount before first tick cleans up without error', async t => {
	const clock = FakeTimers.install();
	const mocks = mockTimerCalls();

	try {
		const stdout = createStdout();
		const {unmount} = render(<AnimatedCounter interval={50} />, {
			stdout,
			debug: true,
		});

		t.is((stdout.write as any).lastCall.args[0], '0');
		t.true(mocks.setTimeoutCallCount >= 1);

		// Unmount before any tick fires — exercises the cleanup path where
		// unsubscribe is called while the timer is still pending.
		unmount();
		t.true(mocks.clearTimeoutCallCount >= 1);

		// Confirm no animation ticks fire after unmount (Ink may write cursor
		// codes on unmount, so compare call counts rather than output value).
		const writeCountAfterUnmount = (stdout.write as any).callCount as number;
		await clock.tickAsync(200);
		t.is((stdout.write as any).callCount, writeCountAfterUnmount);
	} finally {
		mocks.restore();
		clock.uninstall();
	}
});

test.serial(
	'frame resets to 0 on each resume across multiple cycles',
	async t => {
		const clock = FakeTimers.install();

		try {
			const stdout = createStdout();
			const {rerender, unmount} = render(
				<ConditionalAnimation isActive interval={50} />,
				{stdout, debug: true, maxFps: 120},
			);

			// Cycle 1
			await clock.tickAsync(120);
			t.true(
				Number.parseInt((stdout.write as any).lastCall.args[0] as string, 10) >=
					1,
			);
			rerender(<ConditionalAnimation isActive={false} interval={50} />);
			rerender(<ConditionalAnimation isActive interval={50} />);
			t.is((stdout.write as any).lastCall.args[0], '0');

			// Cycle 2
			await clock.tickAsync(120);
			t.true(
				Number.parseInt((stdout.write as any).lastCall.args[0] as string, 10) >=
					1,
			);
			rerender(<ConditionalAnimation isActive={false} interval={50} />);
			rerender(<ConditionalAnimation isActive interval={50} />);
			t.is((stdout.write as any).lastCall.args[0], '0');

			// Cycle 3
			await clock.tickAsync(120);
			t.true(
				Number.parseInt((stdout.write as any).lastCall.args[0] as string, 10) >=
					1,
			);
			rerender(<ConditionalAnimation isActive={false} interval={50} />);
			rerender(<ConditionalAnimation isActive interval={50} />);
			t.is((stdout.write as any).lastCall.args[0], '0');

			unmount();
		} finally {
			clock.uninstall();
		}
	},
);

test.serial(
	'isActive false from mount never starts a timer or advances the frame',
	async t => {
		const clock = FakeTimers.install();
		const mocks = mockTimerCalls();

		try {
			const stdout = createStdout();
			const {unmount} = render(
				<ConditionalAnimation isActive={false} interval={50} />,
				{stdout, debug: true},
			);

			t.is(mocks.setTimeoutCallCount, 0);
			t.is((stdout.write as any).lastCall.args[0], '0');

			await clock.tickAsync(500);

			t.is(mocks.setTimeoutCallCount, 0);
			t.is((stdout.write as any).lastCall.args[0], '0');

			unmount();
			t.is(mocks.clearTimeoutCallCount, 0);
		} finally {
			mocks.restore();
			clock.uninstall();
		}
	},
);

test.serial(
	'suspended transitions do not reset the committed animation before commit',
	async t => {
		let resolveSuspense!: () => void;
		const suspendedRender = new Promise<void>(resolve => {
			resolveSuspense = resolve;
		});
		let suspendWithNewInterval!: () => void;

		function MaybeSuspendingAnimation({
			interval,
			shouldSuspend,
		}: {
			readonly interval: number;
			readonly shouldSuspend: boolean;
		}) {
			const {frame} = useAnimation({interval});

			if (shouldSuspend) {
				// eslint-disable-next-line @typescript-eslint/only-throw-error
				throw suspendedRender;
			}

			return <Text>{String(frame)}</Text>;
		}

		function TestCase() {
			const [interval, setInterval] = React.useState(50);
			const [shouldSuspend, setShouldSuspend] = React.useState(false);

			suspendWithNewInterval = () => {
				startTransition(() => {
					setInterval(200);
					setShouldSuspend(true);
				});
			};

			return (
				<Suspense fallback={<Text>loading</Text>}>
					<MaybeSuspendingAnimation
						interval={interval}
						shouldSuspend={shouldSuspend}
					/>
				</Suspense>
			);
		}

		const stdout = createStdout();
		let instance: ReturnType<typeof render> | undefined;

		try {
			instance = render(<TestCase />, {
				stdout,
				debug: true,
				concurrent: true,
			});

			await delay(130);
			const frameBeforeSuspend = Number.parseInt(stdout.get(), 10);
			t.true(frameBeforeSuspend >= 1);

			await act(async () => {
				suspendWithNewInterval();
			});

			t.is(stdout.get(), String(frameBeforeSuspend));

			await delay(120);
			t.true(Number.parseInt(stdout.get(), 10) > frameBeforeSuspend);
		} finally {
			resolveSuspense();
			instance?.unmount();
		}
	},
);
