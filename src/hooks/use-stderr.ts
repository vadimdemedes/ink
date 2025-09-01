import {useContext} from 'react';
import StderrContext from '../components/StderrContext.js';

/**
`useStderr` is a React hook that exposes the stderr stream.
*/
const useStderr = () => useContext(StderrContext);
export default useStderr;
