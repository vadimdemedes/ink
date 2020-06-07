import {useContext} from 'react';
import FocusContext from '../components/FocusContext';
import type {Props} from '../components/FocusContext';

interface Output {
	/**
	 * Enable focus management for all components.
	 */
	enableFocus: Props['enableFocus'];

	/**
	 * Disable focus management for all components. Currently active component (if there's one) will lose its focus.
	 */
	disableFocus: Props['disableFocus'];

	/**
	 * Switch focus to the next focusable component.
	 * If there's no active component right now, focus will be given to the first focusable component.
	 * If active component is the last in the list of focusable components, focus will be switched to the first component.
	 */
	focusNext: Props['focusNext'];

	/**
	 * Switch focus to the previous focusable component.
	 * If there's no active component right now, focus will be given to the first focusable component.
	 * If active component is the first in the list of focusable components, focus will be switched to the last component.
	 */
	focusPrevious: Props['focusPrevious'];
}

/**
 * This hook exposes methods to enable or disable focus management for all
 * components or manually switch focus to next or previous components.
 */
const useFocusManager = (): Output => {
	const focusContext = useContext(FocusContext);

	return {
		enableFocus: focusContext.enableFocus,
		disableFocus: focusContext.disableFocus,
		focusNext: focusContext.focusNext,
		focusPrevious: focusContext.focusPrevious
	};
};

export default useFocusManager;
