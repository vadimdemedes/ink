import {createContext} from 'react';

export interface StdinContextProps {
	/**
	 * Stdin stream passed to `render()` in `options.stdin` or `process.stdin` by default. Useful if your app needs to handle user input.
	 */
	stdin?: NodeJS.ReadStream;
	/**
	 * Ink exposes this function via own `<StdinContext>` to be able to handle Ctrl+C, that's why you should use Ink's `setRawMode` instead of `process.stdin.setRawMode`.
	 * If the `stdin` stream passed to Ink does not support setRawMode, this function does nothing.
	 */
	setRawMode: (value: boolean) => void;
	/**
	 * A boolean flag determining if the current `stdin` supports `setRawMode`. A component using `setRawMode` might want to use `isRawModeSupported` to nicely fall back in environments where raw mode is not supported.
	 */
	isRawModeSupported: boolean;
}

/**
 * `StdinContext` is a React context, which exposes input stream.
 */
export const StdinContext = createContext<StdinContextProps>({
	stdin: undefined,
	setRawMode: () => {},
	isRawModeSupported: false
});
