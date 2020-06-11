import React from 'react';
import {render, Text, useApp, useStdin} from '../../src';

class Exit extends React.Component<{
	onSetRawMode: (value: boolean) => void;
	onExit: (error: Error) => void;
}> {
	render() {
		return <Text>Hello World</Text>;
	}

	componentDidMount() {
		this.props.onSetRawMode(true);
		setTimeout(this.props.onExit, 500);
	}
}

const Test = () => {
	const {exit} = useApp();
	const {setRawMode} = useStdin();

	return <Exit onExit={exit} onSetRawMode={setRawMode} />;
};

const app = render(<Test />);
app.waitUntilExit().then(() => console.log('exited'));
