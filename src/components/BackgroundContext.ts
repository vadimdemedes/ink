import {createContext} from 'react';
import {type LiteralUnion} from 'type-fest';
import {type ForegroundColorName} from 'ansi-styles';

export type BackgroundColor = LiteralUnion<ForegroundColorName, string>;

export const backgroundContext = createContext<BackgroundColor | undefined>(
	undefined,
);
