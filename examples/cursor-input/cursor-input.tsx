import React, {useRef, useState} from 'react';
import {
	render,
	Box,
	Text,
	Cursor,
	useInput,
	type DOMElement,
} from '../../src/index.js';

function CursorTextInputExample() {
	const [value, setValue] = useState('');
	const cursorAnchorReference = useRef<DOMElement>(null);
	const prompt = '> ';

	useInput((input, key) => {
		if (key.escape) {
			setValue('');
			return;
		}

		if (key.backspace || key.delete) {
			setValue(previousValue => previousValue.slice(0, -1));
			return;
		}

		if (
			!key.ctrl &&
			!key.meta &&
			!key.return &&
			input &&
			!input.includes('\n') &&
			!input.includes('\r')
		) {
			setValue(previousValue => previousValue + input);
		}
	});

	return (
		<Box flexDirection="column">
			<Text>
				Simple text input with declarative cursor (Esc clears, Ctrl+C exits)
			</Text>
			<Box flexDirection="row">
				<Text>{prompt}</Text>
				<Text>{value}</Text>
				<Box ref={cursorAnchorReference} width={0} height={1} />
			</Box>
			<Cursor anchorRef={cursorAnchorReference} />
		</Box>
	);
}

render(<CursorTextInputExample />);
