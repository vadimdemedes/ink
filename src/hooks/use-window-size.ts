import {useState, useEffect} from 'react';
import {getWindowSize} from '../utils.js';
import useStdout from './use-stdout.js';

/**
Dimensions of the terminal window.
*/
export type WindowSize = {
	/**
	Number of columns (horizontal character cells).
	*/
	readonly columns: number;

	/**
	Number of rows (vertical character cells).
	*/
	readonly rows: number;
};

/**
A React hook that returns the current terminal window dimensions and re-renders the component whenever the terminal is resized.
*/
const useWindowSize = (): WindowSize => {
	const {stdout} = useStdout();
	const [size, setSize] = useState<WindowSize>(() => getWindowSize(stdout));

	useEffect(() => {
		const onResize = () => {
			setSize(getWindowSize(stdout));
		};

		stdout.on('resize', onResize);

		return () => {
			stdout.off('resize', onResize);
		};
	}, [stdout]);

	return size;
};

export default useWindowSize;
