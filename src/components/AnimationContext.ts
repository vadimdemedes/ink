import {createContext} from 'react';

type AnimationContextValue = {
	readonly renderThrottleMs: number;
	readonly subscribe: (
		callback: (currentTime: number) => void,
		interval: number,
	) => {
		readonly startTime: number;
		readonly unsubscribe: () => void;
	};
};

// eslint-disable-next-line @typescript-eslint/naming-convention -- React contexts are named like components.
const AnimationContext = createContext<AnimationContextValue>({
	renderThrottleMs: 0,
	subscribe() {
		return {
			startTime: 0,
			unsubscribe() {},
		};
	},
});

AnimationContext.displayName = 'InternalAnimationContext';

export default AnimationContext;
