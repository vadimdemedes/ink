import {createContext} from 'react';
import {type DOMElement} from '../dom.js';

// eslint-disable-next-line @typescript-eslint/naming-convention -- React contexts are named like components.
const RootNodeContext = createContext<DOMElement | undefined>(undefined);

export default RootNodeContext;
