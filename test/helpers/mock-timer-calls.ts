export default function mockTimerCalls() {
	const originalSetTimeout = globalThis.setTimeout;
	const originalClearTimeout = globalThis.clearTimeout;
	let setTimeoutCallCount = 0;
	let clearTimeoutCallCount = 0;
	const timeoutDelays: number[] = [];

	globalThis.setTimeout = ((handler: TimerHandler, timeout?: number) => {
		setTimeoutCallCount++;
		timeoutDelays.push(timeout ?? 0);
		return originalSetTimeout(handler, timeout);
	}) as typeof setTimeout;

	globalThis.clearTimeout = (timer: ReturnType<typeof setTimeout>) => {
		clearTimeoutCallCount++;
		originalClearTimeout(timer);
	};

	return {
		get setTimeoutCallCount() {
			return setTimeoutCallCount;
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
