import {createContext} from 'react';

export interface Props {
	activeId?: string;
	add: (id: string, options: {autoFocus: boolean}) => void;
	remove: (id: string) => void;
	activate: (id: string) => void;
	deactivate: (id: string) => void;
	enableFocus: () => void;
	disableFocus: () => void;
	focusNext: () => void;
	focusPrevious: () => void;
}

const FocusContext = createContext<Props>({
	activeId: undefined,
	add: () => {},
	remove: () => {},
	activate: () => {},
	deactivate: () => {},
	enableFocus: () => {},
	disableFocus: () => {},
	focusNext: () => {},
	focusPrevious: () => {}
});

FocusContext.displayName = 'InternalFocusContext';

export default FocusContext;
