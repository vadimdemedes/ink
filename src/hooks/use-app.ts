import {useContext} from 'react';
import AppContext from '../components/AppContext.js';

/**
A React hook that returns app lifecycle methods like `exit()` and `waitUntilRenderFlush()`.
*/
const useApp = () => useContext(AppContext);
export default useApp;
