import {useContext} from 'react';
import {accessibilityContext} from '../components/AccessibilityContext.js';

/**
 * Returns whether screen reader is enabled. This is useful when you want to
 * render a different output for screen readers.
 */
const useIsScreenReaderEnabled = (): boolean => {
	const {isScreenReaderEnabled} = useContext(accessibilityContext);
	return isScreenReaderEnabled;
};

export default useIsScreenReaderEnabled;
