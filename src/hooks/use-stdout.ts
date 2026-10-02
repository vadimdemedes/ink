import {use} from 'react';
import StdoutContext from '../components/StdoutContext.js';

/**
A React hook that returns the stdout stream where Ink renders your app.
*/
export default function useStdout() {
	return use(StdoutContext);
}
