import React, {type ReactNode, useMemo} from 'react';
import {useAppInternal} from '../../hooks/use-app.js';
import StdinContext from '../StdinContext.js';

type Props = {
	readonly children: ReactNode;
};

function StdinContextProvider({children}: Props): React.ReactNode {
	const {
		stdin,
		handleSetRawMode,
		handleSetBracketedPasteMode,
		isRawModeSupported,
		// eslint-disable-next-line @typescript-eslint/naming-convention
		internal_exitOnCtrlC,
		// eslint-disable-next-line @typescript-eslint/naming-convention
		internal_eventEmitter,
	} = useAppInternal();

	const stdinContextValue = useMemo(
		() => ({
			stdin,
			setRawMode: handleSetRawMode,
			setBracketedPasteMode: handleSetBracketedPasteMode,
			isRawModeSupported,
			// eslint-disable-next-line @typescript-eslint/naming-convention
			internal_exitOnCtrlC,
			// eslint-disable-next-line @typescript-eslint/naming-convention
			internal_eventEmitter,
		}),
		[
			stdin,
			handleSetRawMode,
			handleSetBracketedPasteMode,
			internal_eventEmitter,
			internal_exitOnCtrlC,
			isRawModeSupported,
		],
	);

	return (
		<StdinContext.Provider value={stdinContextValue}>
			{children}
		</StdinContext.Provider>
	);
}

export default StdinContextProvider;
