/* eslint-disable unicorn/no-global-object-property-assignment -- Replacing the global timers is the purpose of this helper. */
export default function mockTimerCalls() {
	const originalSetTimeout = setTimeout;
	const originalClearTimeout = clearTimeout;
	let scheduledTimeoutCount = 0;
	let clearTimeoutCallCount = 0;
	const timeoutDelays: number[] = [];

	globalThis.setTimeout = ((handler: TimerHandler, timeout?: number) => {
		scheduledTimeoutCount++;
		timeoutDelays.push(timeout ?? 0);
		return originalSetTimeout(handler, timeout);
	}) as typeof setTimeout;

	globalThis.clearTimeout = (timer: ReturnType<typeof setTimeout>) => {
		clearTimeoutCallCount++;
		originalClearTimeout(timer);
	};

	return {
		get setTimeoutCallCount() {
			return scheduledTimeoutCount;
		},
		get clearTimeoutCallCount() {
			return clearTimeoutCallCount;
		},
		get timeoutDelays() {
			return timeoutDelays;
		},
		restore() {
			globalThis.setTimeout = originalSetTimeout;
			globalThis.clearTimeout = originalClearTimeout;
		},
	};
}
