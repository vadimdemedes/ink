import {useEffect, useContext} from 'react';
import {StdinContext} from '..';

export default keypressHandler => {
	const {stdin, setRawMode} = useContext(StdinContext);

	useEffect(() => {
		setRawMode(true);
		stdin.on('keypress', keypressHandler);
		return () => {
			stdin.off('keypress', keypressHandler);
			setRawMode(false);
		};
	}, [stdin, setRawMode, keypressHandler]);
};
