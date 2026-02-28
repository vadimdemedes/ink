import {useContext} from 'react';
import StdinContext from '../components/StdinContext.js';

/**
A React hook that returns the stdin stream.
*/
const useStdin = () => useContext(StdinContext);
export default useStdin;
