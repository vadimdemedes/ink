import {createContext} from 'react';

/**
A handle returned by `suspendTerminal()` when called without a callback.

Call `resume()` to give terminal ownership back to Ink, or use `await using`
so the suspension is resumed automatically when it leaves scope.
*/
export type TerminalSuspension = {
	readonly resume: () => Promise<void>;
	readonly [Symbol.asyncDispose]: () => Promise<void>;
};

/**
Temporarily hand the terminal over to a child process (e.g. `$EDITOR`, `less`,
`fzf`), then restore Ink's terminal state and force a full redraw.
*/
export type SuspendTerminal = {
	(callback: () => void | Promise<void>): Promise<void>;
	(): Promise<TerminalSuspension>;
};

export type Props = {
	/**
	Exit (unmount) the whole Ink app.

	- `exit()` — resolves `waitUntilExit()` with `undefined`.
	- `exit(new Error('…'))` — rejects `waitUntilExit()` with the error.
	- `exit(value)` — resolves `waitUntilExit()` with `value`.
	*/
	readonly exit: (errorOrResult?: Error | unknown) => void;

	/**
	Returns a promise that settles after pending render output is flushed to stdout.

	@example
	```jsx
	import {useEffect} from 'react';
	import {useApp} from 'ink';

	const Example = () => {
		const {waitUntilRenderFlush} = useApp();

		useEffect(() => {
			void (async () => {
				await waitUntilRenderFlush();
				runNextCommand();
			})();
		}, [waitUntilRenderFlush]);

		return …;
	};
	```
	*/
	readonly waitUntilRenderFlush: () => Promise<void>;

	/**
	Temporarily release the terminal so a child process can take it over, then
	restore Ink's terminal state and force a full redraw.

	Use the callback form for the common case — Ink restores the terminal even
	if the callback throws:

	@example
	```jsx
	import {useApp} from 'ink';

	const {suspendTerminal} = useApp();

	await suspendTerminal(async () => {
		await runEditor();
	});
	```

	Or hold a suspension and resume it yourself:

	@example
	```jsx
	await using suspension = await suspendTerminal();
	await runEditor();
	```
	*/
	readonly suspendTerminal: SuspendTerminal;
};

/**
`AppContext` is a React context that exposes lifecycle methods for the app.
*/
// Keep the default value typed so `useApp()` preserves the public `exit(errorOrResult?)` signature.
const noopSuspension: TerminalSuspension = {
	async resume() {},
	async [Symbol.asyncDispose]() {},
};

const defaultValue: Props = {
	exit(_errorOrResult?: Error | unknown) {},
	async waitUntilRenderFlush() {},
	suspendTerminal: (async (callback?: () => void | Promise<void>) => {
		if (callback) {
			await callback();
			return undefined;
		}

		return noopSuspension;
	}) as SuspendTerminal,
};

// eslint-disable-next-line @typescript-eslint/naming-convention
const AppContext = createContext(defaultValue);

AppContext.displayName = 'InternalAppContext';

export default AppContext;
