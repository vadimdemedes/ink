import {type ReactNode, type Key, type LegacyRef} from 'react';
import {type Except} from 'type-fest';
import {type DOMElement} from './dom.js';
import {type Styles} from './styles.js';

declare global {
	namespace JSX {
		// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
		interface IntrinsicElements {
			'ink-box': Ink.Box;
			'ink-text': Ink.Text;
			'ink-line': Ink.Line;
		}
	}
}

declare namespace Ink {
	type Box = {
		internal_static?: boolean;
		children?: ReactNode;
		key?: Key;
		ref?: LegacyRef<DOMElement>;
		style?: Except<Styles, 'textWrap'>;
	};

	type Line = {
		key?: Key;
		ref?: LegacyRef<DOMElement>;
		orientation?: 'horizontal' | 'vertical';
		style?: Pick<
			Styles,
			| 'position'
			| 'marginTop'
			| 'marginBottom'
			| 'marginLeft'
			| 'marginRight'
			| 'borderStyle'
			| 'borderColor'
			| 'width'
			| 'height'
		>;
	};

	type Text = {
		children?: ReactNode;
		key?: Key;
		style?: Styles;
		internal_transform?: (children: string) => string;
	};
}
