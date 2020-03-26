import {createContext} from 'react';

export interface AppContextValue {
	exit: (error?: Error) => void;
}

export const AppContext = createContext<AppContextValue>({
	// @ts-ignore
	exit: undefined
});
