import {useEffect, useContext, useMemo} from 'react';
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
A component that uses the `useFocus` hook becomes "focusable" to Ink, so when the user presses <kbd>Tab</kbd>, Ink will switch focus to this component. If there are multiple components that execute the `useFocus` hook, focus will be given to them in the order in which these components are rendered. This hook returns an object with an `isFocused` boolean property, which determines whether this component is focused.
*/
const useFocus = ({
	isActive = true,
	autoFocus = false,
	id: customId,
}: Input = {}): Output => {
	const {isRawModeSupported, setRawMode} = useStdin();
	const {activeId, add, remove, activate, deactivate, focus} =
		useContext(FocusContext);

	const id = useMemo(() => {
		return customId ?? Math.random().toString().slice(2, 7);
	}, [customId]);

	useEffect(() => {
		add(id, {autoFocus});

		return () => {
			remove(id);
		};
	}, [id, autoFocus]);

	useEffect(() => {
		if (isActive) {
			activate(id);
		} else {
			deactivate(id);
		}
	}, [isActive, id]);

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
		isFocused: Boolean(id) && activeId === id,
		focus,
	};
};

export default useFocus;
