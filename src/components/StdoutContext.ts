import {createContext} from 'react';

interface StdoutContextValue {
	stdout?: NodeJS.WriteStream;
}

export const StdoutContext = createContext<StdoutContextValue>({
	stdout: undefined
});
