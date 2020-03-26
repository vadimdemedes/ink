import {useContext} from 'react';
import {StdinContext} from '../components/StdinContext';

/**
 * `useStdin` is a React hook, which exposes props of `StdinContext`.
 * Similar to `useApp`, it's equivalent to consuming `StdinContext` directly.
 */
export const useStdin = () => useContext(StdinContext);
