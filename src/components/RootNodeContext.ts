import {createContext} from 'react';
import {type DOMElement} from '../dom.js';

const rootNodeContext = createContext<DOMElement | undefined>(undefined);

export default rootNodeContext;
