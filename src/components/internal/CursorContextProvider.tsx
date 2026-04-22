import React, {type ReactNode, useMemo} from 'react';
import CursorContext, {type CursorContextValue} from '../CursorContext.js';

type Props = {
	readonly children: ReactNode;
	readonly setCursorPosition: CursorContextValue['setCursorPosition'];
};

function CursorContextProvider({
	children,
	setCursorPosition,
}: Props): React.ReactNode {
	const cursorContextValue = useMemo(
		() => ({
			setCursorPosition,
		}),
		[setCursorPosition],
	);

	return (
		<CursorContext.Provider value={cursorContextValue}>
			{children}
		</CursorContext.Provider>
	);
}

export default CursorContextProvider;
