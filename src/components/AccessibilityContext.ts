import {createContext} from 'react';

// eslint-disable-next-line @typescript-eslint/naming-convention -- React contexts are named like components.
export const AccessibilityContext = createContext({
	isScreenReaderEnabled: false,
});
