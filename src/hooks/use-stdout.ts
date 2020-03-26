import {useContext} from 'react';
import {StdoutContext} from '../components/StdoutContext';

export const useStdout = () => useContext(StdoutContext);
