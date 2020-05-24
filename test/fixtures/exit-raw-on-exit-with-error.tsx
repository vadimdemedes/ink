import React from 'react';
import {render, Box, useApp, useStdin} from '../../src';

class Exit extends React.Component<{
	onSetRawMode: (value: boolean) => void;
	onExit: (error: Error) => void;
}> {
	render() {
		return <Box>Hello World</Box>;
	}

	componentDidMount() {
		this.props.onSetRawMode(true);
		setTimeout(() => this.props.onExit(new Error('errored')), 500);
	}
}

const Test = () => {
	const {exit} = useApp();
	const {setRawMode} = useStdin();

	return <Exit onExit={exit} onSetRawMode={setRawMode} />;
};

const app = render(<Test />);
app.waitUntilExit().catch(error => console.log(error.message));
