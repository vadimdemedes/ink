import React, {
	type ReactNode,
	useRef,
	useCallback,
	useMemo,
	useEffect,
} from 'react';
import AnimationContext from '../AnimationContext.js';

type AnimationSubscriber = {
	readonly callback: (currentTime: number) => void;
	readonly interval: number;
	readonly startTime: number;
	nextDueTime: number;
};

type Props = {
	readonly children: ReactNode;
	readonly renderThrottleMs: number;
};

function AnimationContextProvider({
	children,
	renderThrottleMs,
}: Props): React.ReactNode {
	const animationSubscribersRef = useRef(
		new Map<(currentTime: number) => void, AnimationSubscriber>(),
	);
	const animationTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
		undefined,
	);

	const clearAnimationTimer = useCallback((): void => {
		if (!animationTimerRef.current) {
			return;
		}

		clearTimeout(animationTimerRef.current);
		animationTimerRef.current = undefined;
	}, []);

	const scheduleAnimationTick = useCallback((): void => {
		clearAnimationTimer();

		if (animationSubscribersRef.current.size === 0) {
			return;
		}

		let nextDueTime = Number.POSITIVE_INFINITY;

		for (const subscriber of animationSubscribersRef.current.values()) {
			// One shared timer is enough as long as it wakes at the earliest
			// subscriber deadline and lets slower animations skip that tick.
			nextDueTime = Math.min(nextDueTime, subscriber.nextDueTime);
		}

		const delay = Math.max(0, nextDueTime - performance.now());
		animationTimerRef.current = setTimeout(() => {
			animationTimerRef.current = undefined;
			const currentTime = performance.now();

			for (const subscriber of animationSubscribersRef.current.values()) {
				if (currentTime < subscriber.nextDueTime) {
					continue;
				}

				subscriber.callback(currentTime);
				const elapsedTime = currentTime - subscriber.startTime;
				const elapsedFrames = Math.floor(elapsedTime / subscriber.interval) + 1;
				// Advance from elapsed time rather than callback count so delayed
				// ticks catch up instead of stretching the animation timeline.
				subscriber.nextDueTime =
					subscriber.startTime + elapsedFrames * subscriber.interval;
			}

			scheduleAnimationTick();
		}, delay);
		// Keep the timer ref'd while animations are active so `useAnimation()`
		// can drive process lifetime in both interactive and non-interactive apps.
	}, [clearAnimationTimer]);

	const animationSubscribe = useCallback(
		(
			callback: (currentTime: number) => void,
			interval: number,
		): {readonly startTime: number; readonly unsubscribe: () => void} => {
			const startTime = performance.now();
			// The scheduler owns the start timestamp so hooks can derive frames from
			// the exact same origin that determines each subscriber's due time.
			animationSubscribersRef.current.set(callback, {
				callback,
				interval,
				startTime,
				nextDueTime: startTime + interval,
			});
			scheduleAnimationTick();

			return {
				startTime,
				unsubscribe() {
					animationSubscribersRef.current.delete(callback);

					if (animationSubscribersRef.current.size === 0) {
						clearAnimationTimer();
						return;
					}

					scheduleAnimationTick();
				},
			};
		},
		[clearAnimationTimer, scheduleAnimationTick],
	);

	useEffect(() => {
		return () => {
			clearAnimationTimer();
		};
	}, [clearAnimationTimer]);

	const animationContextValue = useMemo(
		() => ({
			renderThrottleMs,
			subscribe: animationSubscribe,
		}),
		[animationSubscribe, renderThrottleMs],
	);

	return (
		<AnimationContext.Provider value={animationContextValue}>
			{children}
		</AnimationContext.Provider>
	);
}

export default AnimationContextProvider;
