import {EventEmitter} from 'node:events';
import React, {type ReactNode, useRef} from 'react';
import {type CursorPosition} from '../log-update.js';
import AppContextProvider from './internal/AppContextProvider.js';
import StdinContextProvider from './internal/StdinContextProvider.js';
import StdoutContextProvider from './internal/StdoutContextProvider.js';
import StderrContextProvider from './internal/StderrContextProvider.js';
import FocusContextProvider from './internal/FocusContextProvider.js';
import AnimationContextProvider from './internal/AnimationContextProvider.js';
import CursorContextProvider from './internal/CursorContextProvider.js';
import ErrorBoundary from './ErrorBoundary.js';

type Props = {
	readonly children: ReactNode;
	readonly stdin: NodeJS.ReadStream;
	readonly stdout: NodeJS.WriteStream;
	readonly stderr: NodeJS.WriteStream;
	readonly writeToStdout: (data: string) => void;
	readonly writeToStderr: (data: string) => void;
	readonly exitOnCtrlC: boolean;
	readonly onExit: (errorOrResult?: unknown) => void;
	readonly onWaitUntilRenderFlush: () => Promise<void>;
	readonly setCursorPosition: (position: CursorPosition | undefined) => void;
	readonly interactive: boolean;
	readonly renderThrottleMs: number;
};

// Root component for all Ink apps
// It renders stdin and stdout contexts, so that children can access them if needed
// It also handles Ctrl+C exiting and cursor visibility
function App({
	children,
	stdin,
	stdout,
	stderr,
	writeToStdout,
	writeToStderr,
	exitOnCtrlC,
	onExit,
	onWaitUntilRenderFlush,
	setCursorPosition,
	interactive,
	renderThrottleMs,
}: Props): React.ReactNode {
	// eslint-disable-next-line @typescript-eslint/naming-convention
	const internal_eventEmitter = useRef(new EventEmitter());

	return (
		<AppContextProvider
			stdin={stdin}
			stdout={stdout}
			exitOnCtrlC={exitOnCtrlC}
			interactive={interactive}
			eventEmitter={internal_eventEmitter.current}
			onExit={onExit}
			onWaitUntilRenderFlush={onWaitUntilRenderFlush}
		>
			<StdinContextProvider>
				<StdoutContextProvider stdout={stdout} writeToStdout={writeToStdout}>
					<StderrContextProvider stderr={stderr} writeToStderr={writeToStderr}>
						<FocusContextProvider eventEmitter={internal_eventEmitter.current}>
							<AnimationContextProvider renderThrottleMs={renderThrottleMs}>
								<CursorContextProvider setCursorPosition={setCursorPosition}>
									<ErrorBoundary>{children}</ErrorBoundary>
								</CursorContextProvider>
							</AnimationContextProvider>
						</FocusContextProvider>
					</StderrContextProvider>
				</StdoutContextProvider>
			</StdinContextProvider>
		</AppContextProvider>
	);
}

App.displayName = 'InternalApp';

export default App;
