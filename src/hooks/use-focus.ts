import {useEffect, useContext, useId} from 'react';
import FocusContext from '../components/FocusContext.js';
import useStdin from './use-stdin.js';

type Input = {
	/**
	Enable or disable this component's focus, while still maintaining its position in the list of focusable components.
	*/
	isActive?: boolean;

	/**
	Auto-focus this component if there's no active (focused) component right now.
	*/
	autoFocus?: boolean;

	/**
	Assign an ID to this component, so it can be programmatically focused with `focus(id)`.
	*/
	id?: string;
};

type Output = {
	/**
	Determines whether this component is focused.
	*/
	isFocused: boolean;

	/**
	Allows focusing a specific element with the provided `id`.
	*/
	focus: (id: string) => void;
};

/**
A React hook that returns focus state and focus controls for the current component.
A component that uses the `useFocus` hook becomes "focusable" to Ink, so when the user presses <kbd>Tab</kbd>, Ink will switch focus to this component. If there are multiple components that execute the `useFocus` hook, focus will be given to them in registration order. Reordering keyed components does not change their registration order.
*/
const useFocus = ({
	isActive = true,
	autoFocus = false,
	id: customId,
}: Input = {}): Output => {
	const {isRawModeSupported, setRawMode} = useStdin();
	const {activeId, add, remove, activate, deactivate, focus} =
		useContext(FocusContext);

	const generatedId = useId();
	const id = customId ?? generatedId;

	useEffect(() => {
		add(id, {autoFocus});

		return () => {
			remove(id);
		};
	}, [id, autoFocus, add, remove]);

	useEffect(() => {
		// Reapply active state when autoFocus changes and re-registers this component.
		if (isActive) {
			activate(id);
		} else {
			deactivate(id);
		}
	}, [isActive, id, autoFocus, activate, deactivate]);

	useEffect(() => {
		if (!isRawModeSupported || !isActive) {
			return;
		}

		setRawMode(true);

		return () => {
			setRawMode(false);
		};
	}, [isActive, isRawModeSupported, setRawMode]);

	return {
		isFocused: Boolean(id) && activeId === id,
		focus,
	};
};

export default useFocus;
