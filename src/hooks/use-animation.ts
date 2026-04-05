import {
	useState,
	useLayoutEffect,
	useRef,
	useCallback,
	useContext,
} from 'react';
import AnimationContext from '../components/AnimationContext.js';

const defaultAnimationInterval = 100;
const maximumTimerInterval = 2_147_483_647;
const zeroAnimState = {frame: 0, time: 0, delta: 0};

type Options = {
	/**
	Time between ticks in milliseconds.

	@default 100
	*/
	readonly interval?: number;

	/**
	Whether the animation is running. When set to `false`, the animation stops. When toggled back to `true`, all values reset to `0`.

	@default true
	*/
	readonly isActive?: boolean;
};

export type AnimationResult = {
	/**
	Discrete counter that increments by 1 each interval. Useful for indexed sequences like spinner frames.
	*/
	readonly frame: number;

	/**
	Total elapsed time in milliseconds since the animation started or was last reset. Useful for continuous math-based animations like sine waves: `Math.sin(time / 1000 * Math.PI * 2)`.
	*/
	readonly time: number;

	/**
	Time in milliseconds since the previous rendered tick. Accounts for throttled renders. Useful for physics-based or velocity-driven motion: `position += speed * delta`.
	*/
	readonly delta: number;

	/**
	Resets `frame`, `time`, and `delta` to `0` and restarts timing from the current moment. Useful for one-shot animations triggered by events.
	*/
	readonly reset: () => void;
};

/**
A React hook that drives animations. Returns a frame counter, elapsed time, frame delta, and a reset function. All animations share a single timer internally, so multiple animated components consolidate into one render cycle.

@example
```
import {Text, useAnimation} from 'ink';

const Spinner = () => {
	const {frame} = useAnimation({interval: 80});
	const characters = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

	return <Text>{characters[frame % characters.length]}</Text>;
};
```
*/
export default function useAnimation(options?: Options): AnimationResult {
	const {interval = defaultAnimationInterval, isActive = true} = options ?? {};
	const safeInterval = normalizeAnimationInterval(interval);
	const {subscribe, renderThrottleMs} = useContext(AnimationContext);
	const [resetKey, setResetKey] = useState(0);
	const [animState, setAnimState] = useState(zeroAnimState);
	const nextRenderTimeRef = useRef(0);
	const lastRenderTimeRef = useRef(0);
	const previousOptionsRef = useRef({isActive, safeInterval, resetKey});
	const previousOptions = previousOptionsRef.current;
	const shouldReset =
		isActive &&
		(safeInterval !== previousOptions.safeInterval ||
			!previousOptions.isActive ||
			resetKey !== previousOptions.resetKey);

	const reset = useCallback(() => {
		setResetKey(k => k + 1);
	}, []);

	useLayoutEffect(() => {
		if (!isActive) {
			return;
		}

		// Reset to zero immediately so any render that occurs between this
		// effect commit and the first tick shows zeros, not stale values.
		// On initial mount this is a no-op: Object.is bails out because the
		// state was initialized with the same zeroAnimState reference.
		setAnimState(zeroAnimState);

		let startTime = 0;

		const {startTime: subscriberStartTime, unsubscribe} = subscribe(
			currentTime => {
				const isThrottled =
					renderThrottleMs > 0 && currentTime < nextRenderTimeRef.current;

				if (isThrottled) {
					// Coalesce intermediate ticks while Ink is inside the current
					// render-throttle window; the next allowed render will jump
					// straight to the latest elapsed values.
					return;
				}

				const elapsed = currentTime - startTime;
				const nextDelta = currentTime - lastRenderTimeRef.current;

				lastRenderTimeRef.current = currentTime;
				nextRenderTimeRef.current = currentTime + renderThrottleMs;
				setAnimState({
					frame: Math.floor(elapsed / safeInterval),
					time: elapsed,
					delta: nextDelta,
				});
			},
			safeInterval,
		);
		// Use the scheduler's start time instead of sampling our own clock so the
		// first delivered tick cannot start one frame late.
		startTime = subscriberStartTime;
		lastRenderTimeRef.current = subscriberStartTime;
		nextRenderTimeRef.current = startTime + renderThrottleMs;

		return unsubscribe;
	}, [safeInterval, isActive, subscribe, renderThrottleMs, resetKey]);

	useLayoutEffect(() => {
		previousOptionsRef.current = {isActive, safeInterval, resetKey};
	}, [isActive, safeInterval, resetKey]);

	if (shouldReset) {
		return {...zeroAnimState, reset};
	}

	return {...animState, reset};
}

function normalizeAnimationInterval(interval: number): number {
	if (!Number.isFinite(interval)) {
		return defaultAnimationInterval;
	}

	return Math.min(maximumTimerInterval, Math.max(1, interval));
}
