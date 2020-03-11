import React from 'react';

export interface AppContextValue {
	exit: (error?: number | Error) => void;
}

export default React.createContext<AppContextValue>({
	exit: () => {}
});
