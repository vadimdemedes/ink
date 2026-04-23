import {type EventEmitter} from 'node:events';
import React, {
	type ReactNode,
	useRef,
	useCallback,
	useMemo,
	useEffect,
} from 'react';
import AppContext from '../AppContext.js';
import StdoutHelper from './StdoutHelper.js';
import StdinHelper from './StdinHelper.js';

type Props = {
	readonly children: ReactNode;
	readonly stdin: NodeJS.ReadStream;
	readonly stdout: NodeJS.WriteStream;
	readonly exitOnCtrlC: boolean;
	readonly interactive: boolean;
	readonly eventEmitter: EventEmitter;
	readonly onExit: (errorOrResult?: unknown) => void;
	readonly onWaitUntilRenderFlush: () => Promise<void>;
};

function AppContextProvider({
	children,
	stdin,
	stdout,
	exitOnCtrlC,
	interactive,
	eventEmitter,
	onExit,
	onWaitUntilRenderFlush,
}: Props): React.ReactNode {
	const stdinHelper = useRef(
		new StdinHelper(stdin, eventEmitter, onExit, exitOnCtrlC),
	);
	const stdoutHelper = useRef(new StdoutHelper(stdout, interactive));

	const handleExit = useCallback(
		(errorOrResult?: unknown): void => {
			stdinHelper.current.handleExit(errorOrResult);
		},
		[stdinHelper],
	);

	const handleSetRawMode = useCallback(
		(isEnabled: boolean): void => {
			stdinHelper.current.handleSetRawMode(isEnabled);
		},
		[stdinHelper],
	);

	const handleSetBracketedPasteMode = useCallback(
		(isEnabled: boolean) => {
			stdoutHelper.current.handleSetBracketedPasteMode(isEnabled);
		},
		[stdoutHelper],
	);

	// Handle cursor visibility, raw mode, and bracketed paste mode cleanup on unmount
	useEffect(() => {
		const currentStdinHelper = stdinHelper.current;
		const currentStdoutHelper = stdoutHelper.current;
		return () => {
			currentStdinHelper.handleUnmount();
			currentStdoutHelper.handleUnmount();
		};
	}, [stdinHelper, stdoutHelper]);

	// Memoize context values to prevent unnecessary re-renders
	const appContextValue = useMemo(
		() => ({
			exit: handleExit,
			waitUntilRenderFlush: onWaitUntilRenderFlush,
			stdin,
			handleSetRawMode,
			handleSetBracketedPasteMode,
			isRawModeSupported: stdinHelper.current.isRawModeSupported,
			// eslint-disable-next-line @typescript-eslint/naming-convention
			internal_exitOnCtrlC: exitOnCtrlC,
			// eslint-disable-next-line @typescript-eslint/naming-convention
			internal_eventEmitter: eventEmitter,
		}),
		[
			handleExit,
			onWaitUntilRenderFlush,
			exitOnCtrlC,
			handleSetRawMode,
			handleSetBracketedPasteMode,
			stdin,
			eventEmitter,
		],
	);

	return (
		<AppContext.Provider value={appContextValue}>
			{children}
		</AppContext.Provider>
	);
}

AppContextProvider.displayName = 'InternalAppContextProvider';

export default AppContextProvider;
