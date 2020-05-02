import {useContext} from 'react';
import {AppContext} from '../components/AppContext';

/**
 * `useApp` is a React hook, which exposes props of `AppContext`.
 * ```js
 * import {useApp} from 'ink';
 *
 * const MyApp = () => {
 *   const {exit} = useApp();
 * };
 * ```
 *
 * It's equivalent to consuming `AppContext` props via `AppContext.Consumer`:
 *
 * ```jsx
 * <AppContext.Consumer>
 *   {({exit}) => {
 *     // …
 *   }}
 * </AppContext.Consumer>
 * ```
 */
export const useApp = () => useContext(AppContext);
