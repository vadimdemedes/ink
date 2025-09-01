import {useContext} from 'react';
import StdinContext from '../components/StdinContext.js';

/**
`useStdin` is a React hook that exposes the stdin stream.
*/
const useStdin = () => useContext(StdinContext);
export default useStdin;
