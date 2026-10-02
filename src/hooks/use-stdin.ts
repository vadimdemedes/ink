import {use} from 'react';
import StdinContext, {
	type PublicProps,
	type Props,
} from '../components/StdinContext.js';

/**
A React hook that returns the stdin stream and stdin-related utilities.
*/
const useStdin = (): PublicProps => use(StdinContext);

export const useStdinContext = (): Props => use(StdinContext);

export default useStdin;
