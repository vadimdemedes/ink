import {useContext} from 'react';
import StderrContext from '../components/StderrContext.js';

/**
A React hook that returns the stderr stream.
*/
const useStderr = () => useContext(StderrContext);
export default useStderr;
