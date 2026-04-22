import {type EventEmitter} from 'node:events';
import React, {
	type ReactNode,
	useState,
	useRef,
	useCallback,
	useMemo,
	useEffect,
} from 'react';
import FocusContext from '../FocusContext.js';

const tab = '\t';
const shiftTab = '\u001B[Z';
const escape = '\u001B';

type Props = {
	readonly children: ReactNode;
	readonly eventEmitter: EventEmitter;
};

type Focusable = {
	readonly id: string;
	readonly isActive: boolean;
};

function FocusContextProvider({
	children,
	eventEmitter,
}: Props): React.ReactNode {
	const [isFocusEnabled, setIsFocusEnabled] = useState(true);
	const [activeFocusId, setActiveFocusId] = useState<string | undefined>(
		undefined,
	);
	// Focusables array is managed internally via setFocusables callback pattern
	// eslint-disable-next-line react/hook-use-state
	const [, setFocusables] = useState<Focusable[]>([]);
	// Track focusables count for tab navigation check (avoids stale closure)
	const focusablesCountRef = useRef(0);

	// Focus navigation helpers
	const findNextFocusable = useCallback(
		(
			currentFocusables: Focusable[],
			currentActiveFocusId: string | undefined,
		): string | undefined => {
			const activeIndex = currentFocusables.findIndex(focusable => {
				return focusable.id === currentActiveFocusId;
			});

			for (
				let index = activeIndex + 1;
				index < currentFocusables.length;
				index++
			) {
				const focusable = currentFocusables[index];

				if (focusable?.isActive) {
					return focusable.id;
				}
			}

			return undefined;
		},
		[],
	);

	const findPreviousFocusable = useCallback(
		(
			currentFocusables: Focusable[],
			currentActiveFocusId: string | undefined,
		): string | undefined => {
			const activeIndex = currentFocusables.findIndex(focusable => {
				return focusable.id === currentActiveFocusId;
			});

			for (let index = activeIndex - 1; index >= 0; index--) {
				const focusable = currentFocusables[index];

				if (focusable?.isActive) {
					return focusable.id;
				}
			}

			return undefined;
		},
		[],
	);

	const focusNext = useCallback((): void => {
		setFocusables(currentFocusables => {
			setActiveFocusId(currentActiveFocusId => {
				const firstFocusableId = currentFocusables.find(
					focusable => focusable.isActive,
				)?.id;
				const nextFocusableId = findNextFocusable(
					currentFocusables,
					currentActiveFocusId,
				);

				return nextFocusableId ?? firstFocusableId;
			});
			return currentFocusables;
		});
	}, [findNextFocusable]);

	const focusPrevious = useCallback((): void => {
		setFocusables(currentFocusables => {
			setActiveFocusId(currentActiveFocusId => {
				const lastFocusableId = currentFocusables.findLast(
					focusable => focusable.isActive,
				)?.id;
				const previousFocusableId = findPreviousFocusable(
					currentFocusables,
					currentActiveFocusId,
				);

				return previousFocusableId ?? lastFocusableId;
			});
			return currentFocusables;
		});
	}, [findPreviousFocusable]);

	// Handle tab navigation via effect that subscribes to input events
	useEffect(() => {
		const handleTabNavigation = (input: string): void => {
			if (!isFocusEnabled || focusablesCountRef.current === 0) return;

			if (input === tab) {
				focusNext();
			}

			if (input === shiftTab) {
				focusPrevious();
			}

			// Reset focus when there's an active focused component on Esc
			if (input === escape && isFocusEnabled) {
				setActiveFocusId(undefined);
			}
		};

		eventEmitter.on('input', handleTabNavigation);

		return () => {
			eventEmitter.off('input', handleTabNavigation);
		};
	}, [eventEmitter, isFocusEnabled, focusNext, focusPrevious]);

	const enableFocus = useCallback((): void => {
		setIsFocusEnabled(true);
	}, []);

	const disableFocus = useCallback((): void => {
		setIsFocusEnabled(false);
	}, []);

	const focus = useCallback((id: string): void => {
		setFocusables(currentFocusables => {
			const hasFocusableId = currentFocusables.some(
				focusable => focusable?.id === id,
			);

			if (hasFocusableId) {
				setActiveFocusId(id);
			}

			return currentFocusables;
		});
	}, []);

	const addFocusable = useCallback(
		(id: string, {autoFocus}: {autoFocus: boolean}): void => {
			setFocusables(currentFocusables => {
				focusablesCountRef.current = currentFocusables.length + 1;

				return [
					...currentFocusables,
					{
						id,
						isActive: true,
					},
				];
			});

			if (autoFocus) {
				setActiveFocusId(currentActiveFocusId => {
					if (!currentActiveFocusId) {
						return id;
					}

					return currentActiveFocusId;
				});
			}
		},
		[],
	);

	const removeFocusable = useCallback((id: string): void => {
		setActiveFocusId(currentActiveFocusId => {
			if (currentActiveFocusId === id) {
				return undefined;
			}

			return currentActiveFocusId;
		});

		setFocusables(currentFocusables => {
			const filtered = currentFocusables.filter(focusable => {
				return focusable.id !== id;
			});
			focusablesCountRef.current = filtered.length;

			return filtered;
		});
	}, []);

	const activateFocusable = useCallback((id: string): void => {
		setFocusables(currentFocusables =>
			currentFocusables.map(focusable => {
				if (focusable.id !== id) {
					return focusable;
				}

				return {
					id,
					isActive: true,
				};
			}),
		);
	}, []);

	const deactivateFocusable = useCallback((id: string): void => {
		setActiveFocusId(currentActiveFocusId => {
			if (currentActiveFocusId === id) {
				return undefined;
			}

			return currentActiveFocusId;
		});

		setFocusables(currentFocusables =>
			currentFocusables.map(focusable => {
				if (focusable.id !== id) {
					return focusable;
				}

				return {
					id,
					isActive: false,
				};
			}),
		);
	}, []);

	const focusContextValue = useMemo(
		() => ({
			activeId: activeFocusId,
			add: addFocusable,
			remove: removeFocusable,
			activate: activateFocusable,
			deactivate: deactivateFocusable,
			enableFocus,
			disableFocus,
			focusNext,
			focusPrevious,
			focus,
		}),
		[
			activeFocusId,
			addFocusable,
			removeFocusable,
			activateFocusable,
			deactivateFocusable,
			enableFocus,
			disableFocus,
			focusNext,
			focusPrevious,
			focus,
		],
	);

	return (
		<FocusContext.Provider value={focusContextValue}>
			{children}
		</FocusContext.Provider>
	);
}

export default FocusContextProvider;
