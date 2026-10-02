import {use} from 'react';
import AppContext from '../components/AppContext.js';

/**
A React hook that returns app lifecycle methods like `exit()` and `waitUntilRenderFlush()`.
*/
export default function useApp() {
	return use(AppContext);
}
