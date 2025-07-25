import React from 'react';
import {render, Text} from '../../src/index.js';

function Ci({text}: {readonly text: string}) {
	return <Text>{text}</Text>;
}

const instance = render(<Ci text="Hello" />, {ci: false});

setTimeout(() => {
	instance.rerender(<Ci text="World" />);
}, 50);
