import {createContext} from 'react';

export interface AppContextValue {
	exit: (error?: Error) => void;
}

export default createContext<AppContextValue>({
	exit: () => {}
});
