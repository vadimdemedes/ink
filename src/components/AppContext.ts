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

/**
`AppContext` is a React context that exposes lifecycle methods for the app.
*/
// eslint-disable-next-line @typescript-eslint/naming-convention
const AppContext = createContext<Props>({
	exit() {},
	async waitUntilRenderFlush() {},
});

AppContext.displayName = 'InternalAppContext';

export default AppContext;
