import {createContext} from 'react';

export interface AppContextProps {
	exit: (error?: Error) => void;
}

/**
 * `AppContext` is a React context, which exposes a method to manually exit the app (unmount).
 */
export const AppContext = createContext<AppContextProps>({
	exit: () => {}
});
