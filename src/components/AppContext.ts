import React from 'react';

export interface AppContextValue {
	exit: (error?: Error) => void;
}

export default React.createContext<AppContextValue>({
	exit: () => {}
});
