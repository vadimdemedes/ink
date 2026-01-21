import React from 'react';
import {render, Text, useStdin} from '../../src/index.js';
import {writeReadySignal} from '../helpers/ready.js';

class Exit extends React.Component<{
	onSetRawMode: (value: boolean) => void;
}> {
	override render() {
		return <Text>Hello World</Text>;
	}

	override componentDidMount() {
		this.props.onSetRawMode(true);
	}
}

function Test() {
	const {setRawMode} = useStdin();
	return <Exit onSetRawMode={setRawMode} />;
}

const app = render(<Test />);

// Signal to test harness that Ink is ready to accept input
writeReadySignal();

setTimeout(() => {
	app.unmount();
}, 500);

await app.waitUntilExit();
console.log('exited');
