import {EventEmitter} from 'node:events';
import process from 'node:process';
import {createContext} from 'react';

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
};

export type InternalProps = Props & {
	stdin: NodeJS.ReadStream;
	handleSetRawMode: (value: boolean) => void;
	handleSetBracketedPasteMode: (value: boolean) => void;
	isRawModeSupported: boolean;
	internal_exitOnCtrlC: boolean;
	internal_eventEmitter: EventEmitter;
};

/**
`AppContext` is a React context that exposes lifecycle methods for the app externally,
and internal helpers for other internal context providers.
*/
// Keep the default value typed so `useApp()` preserves the public `exit(errorOrResult?)` signature.
const defaultValue: InternalProps = {
	exit(_errorOrResult?: Error | unknown) {},
	async waitUntilRenderFlush() {},
	stdin: process.stdin,
	handleSetRawMode() {},
	handleSetBracketedPasteMode() {},
	isRawModeSupported: false,
	// eslint-disable-next-line @typescript-eslint/naming-convention
	internal_exitOnCtrlC: true,
	// eslint-disable-next-line @typescript-eslint/naming-convention
	internal_eventEmitter: new EventEmitter(),
};

// eslint-disable-next-line @typescript-eslint/naming-convention
const AppContext = createContext<InternalProps>(defaultValue);

AppContext.displayName = 'InternalAppContext';

export default AppContext;
