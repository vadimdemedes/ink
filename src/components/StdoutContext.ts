import {createContext} from 'react';

export interface Props {
	/**
	 * Stdout stream passed to `render()` in `options.stdout` or `process.stdout` by default.
	 */
	readonly stdout?: NodeJS.WriteStream;

	/**
	 * Write any string to stdout, while preserving Ink's output.
	 * It's useful when you want to display some external information outside of Ink's rendering and ensure there's no conflict between the two.
	 * It's similar to `<Static>`, except it can't accept components, it only works with strings.
	 */
	readonly write: (data: string) => void;
}

/**
 * `StdoutContext` is a React context, which exposes stdout stream, where Ink renders your app.
 */
const StdoutContext = createContext<Props>({
	stdout: undefined,
	write: () => {}
});

StdoutContext.displayName = 'InternalStdoutContext';

export default StdoutContext;
