import {useEffect, useContext, useMemo} from 'react';
import FocusContext from '../components/FocusContext';
import useStdin from './use-stdin';

interface Input {
	/**
	 * Enable or disable this component's focus, while still maintaining its position in the list of focusable components.
	 */
	isActive?: boolean;

	/**
	 * Auto focus this component, if there's no active (focused) component right now.
	 */
	autoFocus?: boolean;

	/**
	 * Assign an ID to this component, so it can be programmatically focused with `focus(id)`.
	 */
	id?: string;
}

interface Output {
	/**
	 * Determines whether this component is focused or not.
	 */
	isFocused: boolean;

	/**
	 * Allows focusing a specific element with the provided `id`.
	 */
	focus: (id: string) => void;
}

/**
 * Component that uses `useFocus` hook becomes "focusable" to Ink,
 * so when user presses <kbd>Tab</kbd>, Ink will switch focus to this component.
 * If there are multiple components that execute `useFocus` hook, focus will be
 * given to them in the order that these components are rendered in.
 * This hook returns an object with `isFocused` boolean property, which
 * determines if this component is focused or not.
 */
const useFocus = ({
	isActive = true,
	autoFocus = false,
	id
}: Input = {}): Output => {
	const {isRawModeSupported, setRawMode} = useStdin();
	const {activeId, add, remove, activate, deactivate, focus} = useContext(
		FocusContext
	);

	const resolvedId = useMemo(() => id ?? Math.random().toString().slice(2, 7), [
		id
	]);

	useEffect(() => {
		add(resolvedId, {autoFocus});

		return () => {
			remove(resolvedId);
		};
	}, [resolvedId, autoFocus]);

	useEffect(() => {
		if (isActive) {
			activate(resolvedId);
		} else {
			deactivate(resolvedId);
		}
	}, [isActive, resolvedId]);

	useEffect(() => {
		if (!isRawModeSupported || !isActive) {
			return;
		}

		setRawMode(true);

		return () => {
			setRawMode(false);
		};
	}, [isActive]);

	return {
		isFocused: Boolean(resolvedId) && activeId === resolvedId,
		focus
	};
};

export default useFocus;
