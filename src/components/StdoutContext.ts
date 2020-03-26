import {createContext} from 'react';

export interface StdoutProps {
	/**
	 * Stdout stream passed to `render()` in `options.stdout` or `process.stdout` by default.
	 */
	stdout?: NodeJS.WriteStream;
}

/**
 * `StdoutContext` is a React context, which exposes stdout stream, where Ink renders your app.
 */
export const StdoutContext = createContext<StdoutProps>({
	stdout: undefined
});
