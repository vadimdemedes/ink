import {useContext} from 'react';
import AppContext from '../components/AppContext';

/**
 * `useApp` is a React hook, which exposes app props.
 * ```js
 * import {useApp} from 'ink';
 *
 * const MyApp = () => {
 *   const {exit} = useApp();
 * };
 * ```
 */

const useApp = () => useContext(AppContext);
export default useApp;
