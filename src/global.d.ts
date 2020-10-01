import {ReactNode, Key, LegacyRef} from 'react';
import {Except} from 'type-fest';
import {DOMElement} from './dom';
import {Styles} from './styles';

declare global {
	namespace JSX {
		interface IntrinsicElements {
			'ink-box': Ink.Box;
			'ink-text': Ink.Text;
		}
	}
}

declare namespace Ink {
	interface Box {
		children?: ReactNode;
		key?: Key;
		ref?: LegacyRef<DOMElement>;
		style?: Except<Styles, 'textWrap'>;
	}

	interface Text {
		children?: ReactNode;
		key?: Key;
		style?: Styles;
		internal_transform?: (children: string) => string;
	}
}
