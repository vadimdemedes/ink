import {useContext} from 'react';
import AppContext from '../components/AppContext';

/**
 * `useApp` is a React hook, which exposes a method to manually exit the app (unmount).
 */
const useApp = () => useContext(AppContext);
export default useApp;
