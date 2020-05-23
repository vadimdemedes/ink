import {createContext} from 'react';

export interface Props {
	exit: (error?: Error) => void;
}

/**
 * `AppContext` is a React context, which exposes a method to manually exit the app (unmount).
 */
const AppContext = createContext<Props>({
	exit: () => {}
});

AppContext.displayName = 'InternalAppContext';

export default AppContext;
