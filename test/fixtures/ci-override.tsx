import React from 'react';
import {render, Text} from '../../src/index.js';

function Test({text}: {readonly text: string}) {
	return <Text>{text}</Text>;
}

const instance = render(<Test text="Hello" />, {ci: true});

setTimeout(() => {
	instance.rerender(<Test text="World" />);
}, 50);
