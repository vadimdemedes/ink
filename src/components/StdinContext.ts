import {createContext} from 'react';

export interface StdinContextValue {
	stdin: NodeJS.ReadStream;
	setRawMode: (value: boolean) => void;
	isRawModeSupported: boolean;
}

export const StdinContext = createContext<StdinContextValue>({
	stdin: undefined,
	setRawMode: undefined,
	isRawModeSupported: false
});
