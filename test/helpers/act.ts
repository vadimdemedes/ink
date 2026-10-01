import {act as reactAct} from 'react';

declare global {
	// eslint-disable-next-line @typescript-eslint/naming-convention
	var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

/**
React's `act()`, but it marks the environment as an act environment only while the callback runs.

Setting `IS_REACT_ACT_ENVIRONMENT` for a whole file would make React warn about every update outside `act()`, and most tests render without it. Without the flag, React warns that the environment is not configured to support `act()`.
*/
export async function act<T>(callback: () => T | Promise<T>): Promise<T> {
	const previousValue = globalThis.IS_REACT_ACT_ENVIRONMENT;
	// eslint-disable-next-line unicorn/no-global-object-property-assignment -- React reads this global flag.
	globalThis.IS_REACT_ACT_ENVIRONMENT = true;

	try {
		return await reactAct(callback);
	} finally {
		// eslint-disable-next-line unicorn/no-global-object-property-assignment -- React reads this global flag.
		globalThis.IS_REACT_ACT_ENVIRONMENT = previousValue;
	}
}
