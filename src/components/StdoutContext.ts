import {createContext} from 'react';

export interface StdoutContextValue {
	stdout?: NodeJS.WriteStream;
}

export const StdoutContext = createContext<StdoutContextValue>({
	stdout: undefined
});
