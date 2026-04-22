import {useContext} from 'react';
import AppContext, {
	type Props,
	type InternalProps,
} from '../components/AppContext.js';

/**
A React hook that returns app lifecycle methods like `exit()` and `waitUntilRenderFlush()`.
*/
const useApp = (): Props => useContext(AppContext);

/**
A React hook that returns internal app concerns.
*/
export const useAppInternal = (): InternalProps => useContext(AppContext);

export default useApp;
