import {useContext} from 'react';
import {StdinContext} from '../components/StdinContext';

export const useStdin = () => useContext(StdinContext);
