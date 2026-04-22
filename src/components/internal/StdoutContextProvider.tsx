import React, {type ReactNode, useMemo} from 'react';
import StdoutContext, {
	type Props as StdoutContextProps,
} from '../StdoutContext.js';

type Props = {
	readonly children: ReactNode;
	readonly stdout: StdoutContextProps['stdout'];
	readonly writeToStdout: StdoutContextProps['write'];
};

function StdoutContextProvider({
	children,
	stdout,
	writeToStdout,
}: Props): React.ReactNode {
	const stdoutContextValue = useMemo(
		() => ({
			stdout,
			write: writeToStdout,
		}),
		[stdout, writeToStdout],
	);

	return (
		<StdoutContext.Provider value={stdoutContextValue}>
			{children}
		</StdoutContext.Provider>
	);
}

export default StdoutContextProvider;
