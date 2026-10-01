import {use} from 'react';
import {AccessibilityContext} from '../components/AccessibilityContext.js';

/**
A React hook that returns whether a screen reader is enabled.
This is useful when you want to render different output for screen readers.
*/
const useIsScreenReaderEnabled = (): boolean => {
	const {isScreenReaderEnabled} = use(AccessibilityContext);
	return isScreenReaderEnabled;
};

export default useIsScreenReaderEnabled;
