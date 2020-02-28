import {useState, useContext, useEffect} from 'react';
import FocusContext from '../components/FocusContext';

export default function useFocus() {
	const focusContext = useContext(FocusContext);
	const [focusKey, setFocusKey] = useState(null);

	useEffect(() => {
		// Register as a focusable element
		const generatedFocusKey = focusContext.register();
		setFocusKey(generatedFocusKey);

		// Unregister on unmount
		return () => {
			focusContext.unregister(generatedFocusKey);
		};
	}, [focusContext]);

	return focusContext.hasFocus(focusKey);
}
