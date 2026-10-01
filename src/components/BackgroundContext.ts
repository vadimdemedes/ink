import {createContext} from 'react';
import {type LiteralUnion} from 'type-fest';
import {type ForegroundColorName} from 'ansi-styles';

export type BackgroundColor = LiteralUnion<ForegroundColorName, string>;

// eslint-disable-next-line @typescript-eslint/naming-convention -- React contexts are named like components.
export const BackgroundContext = createContext<BackgroundColor | undefined>(
	undefined,
);
