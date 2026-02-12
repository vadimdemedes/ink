import React, {type RefObject} from 'react';
import {type DOMElement, type CursorAnchorRef} from '../dom.js';

export type Props = {
	/**
	Optional reference to anchor cursor coordinates to a different element.

	If omitted, `<Cursor>` uses the parent container as anchor.

	If `anchorRef` is set but currently unresolved, Ink hides the cursor for that frame.

	If multiple `<Cursor>` components are rendered in one frame, the last rendered one controls the terminal cursor position.
	*/
	// eslint-disable-next-line @typescript-eslint/ban-types
	readonly anchorRef?: RefObject<DOMElement | null>;

	/**
	Horizontal offset from anchor content origin.
	*/
	readonly x?: number;

	/**
	Vertical offset from anchor content origin.
	*/
	readonly y?: number;
};

/**
Declaratively position the terminal cursor relative to a container.

Use this component when building reusable inputs where absolute root coordinates are inconvenient.

`<Cursor>` must not be rendered inside `<Text>`.

@example
```jsx
import {Box, Cursor, Text} from 'ink';
import {useRef} from 'react';

const prompt = '> ';
const value = 'hello';

const Example = () => {
	const cursorAnchorReference = useRef();

	return (
		<Box flexDirection="row">
			<Text>{prompt}</Text>
			<Text>{value}</Text>
			<Box ref={cursorAnchorReference} width={0} height={1} />
			<Cursor anchorRef={cursorAnchorReference} />
		</Box>
	);
};
```
*/
export default function Cursor({anchorRef, x = 0, y = 0}: Props) {
	const normalizedAnchorReference: CursorAnchorRef | undefined =
		anchorRef ?? undefined;

	return (
		<ink-cursor
			internal_cursor={{
				anchorRef: normalizedAnchorReference,
				x,
				y,
			}}
		/>
	);
}
