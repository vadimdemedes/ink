import {createContext} from 'react';

export interface StdoutContextProps {
	/**
	 * Stdout stream passed to `render()` in `options.stdout` or `process.stdout` by default.
	 */
	stdout?: NodeJS.WriteStream;

	/**
	 * Write any string to stdout, while preserving Ink's output.
	 * It's useful when you want to display some external information outside of Ink's rendering and ensure there's no conflict between the two.
	 * It's similar to `<Static>`, except it can't accept components, it only works with strings.
	 */
	write: (data: string) => void;
}

/**
 * `StdoutContext` is a React context, which exposes stdout stream, where Ink renders your app.
 */
export const StdoutContext = createContext<StdoutContextProps>({
	stdout: undefined,
	write: () => {}
});
