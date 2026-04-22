import React, {type ReactNode, useMemo} from 'react';
import StderrContext, {
	type Props as StderrContextProps,
} from '../StderrContext.js';

type Props = {
	readonly children: ReactNode;
	readonly stderr: StderrContextProps['stderr'];
	readonly writeToStderr: StderrContextProps['write'];
};

function StderrContextProvider({
	children,
	stderr,
	writeToStderr,
}: Props): React.ReactNode {
	const stderrContextValue = useMemo(
		() => ({
			stderr,
			write: writeToStderr,
		}),
		[stderr, writeToStderr],
	);

	return (
		<StderrContext.Provider value={stderrContextValue}>
			{children}
		</StderrContext.Provider>
	);
}

export default StderrContextProvider;
