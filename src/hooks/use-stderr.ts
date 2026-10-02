import {use} from 'react';
import StderrContext from '../components/StderrContext.js';

/**
A React hook that returns the stderr stream.
*/
export default function useStderr() {
	return use(StderrContext);
}
