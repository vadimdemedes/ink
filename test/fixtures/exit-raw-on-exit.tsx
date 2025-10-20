import React from 'react';
import {render, Text, useApp, useStdin} from '../../src/index.js';
import {writeReadySignal} from '../helpers/ready.js';

class Exit extends React.Component<{
	onSetRawMode: (value: boolean) => void;
	onExit: (error: Error) => void;
}> {
	override render() {
		return <Text>Hello World</Text>;
	}

	override componentDidMount() {
		this.props.onSetRawMode(true);
		setTimeout(this.props.onExit, 500);
	}
}

function Test() {
	const {exit} = useApp();
	const {setRawMode} = useStdin();

	return <Exit onExit={exit} onSetRawMode={setRawMode} />;
}

const app = render(<Test />);

// Signal to test harness that Ink is ready to accept input
writeReadySignal();

await app.waitUntilExit();
console.log('exited');
