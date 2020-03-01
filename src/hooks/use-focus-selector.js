import {useContext, useEffect, useState} from 'react';
import {StdinContext} from '..';

const TAB = '\t';
const SHIFT_TAB = '\u001B[Z';

let FOCUS_ID = 0;
function nextFocusId() {
	FOCUS_ID++;

	return FOCUS_ID;
}

export default function useFocusSelector() {
	const [currentFocusedIndex, setCurrentFocusedIndex] = useState(0);
	const [elementList, setElementList] = useState([]);

	const register = () => {
		const focusId = nextFocusId();
		elementList.push(focusId);
		setElementList(elementList.slice(0));

		return focusId;
	};

	function unregister(focusId) {
		setElementList(prev => prev.filter(element => element !== focusId));
	}

	function hasFocus(focusId) {
		return elementList[currentFocusedIndex] === focusId;
	}

	const {stdin, isRawModeSupported, setRawMode} = useContext(StdinContext);

	useEffect(() => {
		if (isRawModeSupported) {
			setRawMode(true);
		}

		return () => {
			if (isRawModeSupported) {
				setRawMode(false);
			}
		};
	}, [isRawModeSupported, setRawMode]);

	useEffect(() => {
		function focusPrevious() {
			let newIndex = currentFocusedIndex - 1;
			if (newIndex < 0) {
				newIndex = elementList.length - 1;
			}

			setCurrentFocusedIndex(newIndex);
		}

		function focusNext() {
			let newIndex = currentFocusedIndex + 1;
			if (newIndex >= elementList.length) {
				newIndex = 0;
			}

			setCurrentFocusedIndex(newIndex);
		}

		const handleData = data => {
			const s = String(data);

			if (s === TAB) {
				focusNext();
			} else if (s === SHIFT_TAB) {
				focusPrevious();
			}
		};

		stdin.on('data', handleData);

		return () => {
			stdin.off('data', handleData);
		};
	}, [stdin, currentFocusedIndex, elementList.length]);

	return {register, unregister, hasFocus, elementList, currentFocusedIndex};
}
