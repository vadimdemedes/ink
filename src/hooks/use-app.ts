import {useContext} from 'react';
import AppContext from '../components/AppContext.js';

/**
`useApp` is a React hook that exposes app lifecycle methods like `exit()` and `waitUntilRenderFlush()`.
*/
const useApp = () => useContext(AppContext);
export default useApp;
