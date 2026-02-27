import {useContext} from 'react';
import StdinContext, {
	type PublicProps,
	type Props,
} from '../components/StdinContext.js';

/**
A React hook that returns the stdin stream and stdin-related utilities.
*/
const useStdin = (): PublicProps => useContext(StdinContext);

export const useStdinContext = (): Props => useContext(StdinContext);

export default useStdin;
