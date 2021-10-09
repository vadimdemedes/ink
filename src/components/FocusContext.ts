import {createContext} from 'react';

export interface Props {
	readonly activeId?: string;
	readonly add: (id: string, options: {autoFocus: boolean}) => void;
	readonly remove: (id: string) => void;
	readonly activate: (id: string) => void;
	readonly deactivate: (id: string) => void;
	readonly enableFocus: () => void;
	readonly disableFocus: () => void;
	readonly focusNext: () => void;
	readonly focusPrevious: () => void;
	readonly focus: (id: string) => void;
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
	focusPrevious: () => {},
	focus: () => {}
});

FocusContext.displayName = 'InternalFocusContext';

export default FocusContext;
