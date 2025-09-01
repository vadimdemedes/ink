import {useContext} from 'react';
import StdoutContext from '../components/StdoutContext.js';

/**
`useStdout` is a React hook that exposes the stdout stream where Ink renders your app.
*/
const useStdout = () => useContext(StdoutContext);
export default useStdout;
