import {useContext} from 'react';
import {accessibilityContext} from '../components/AccessibilityContext.js';

/**
Returns whether a screen reader is enabled. This is useful when you want to render different output for screen readers.
*/
const useIsScreenReaderEnabled = (): boolean => {
	const {isScreenReaderEnabled} = useContext(accessibilityContext);
	return isScreenReaderEnabled;
};

export default useIsScreenReaderEnabled;
