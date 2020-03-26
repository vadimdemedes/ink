import {useContext} from 'react';
import {AppContext} from '../components/AppContext';

export const useApp = () => useContext(AppContext);
