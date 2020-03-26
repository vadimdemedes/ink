import {useContext} from 'react';
import {StdoutContext} from '../components/StdoutContext';

/**
 * `useStdout` is a React hook, which exposes props of `StdoutContext`.
 * Similar to `useStdout`, it's equivalent to consuming `StdoutContext` directly.
 */
export const useStdout = () => useContext(StdoutContext);
