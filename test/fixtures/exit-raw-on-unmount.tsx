import React from 'react';
import {render, Box, useStdin} from '../../src';

class Exit extends React.Component<{
	onSetRawMode: (value: boolean) => void;
}> {
	render() {
		return <Box>Hello World</Box>;
	}

	componentDidMount() {
		this.props.onSetRawMode(true);
	}
}

const Test = () => {
	const {setRawMode} = useStdin();
	return <Exit onSetRawMode={setRawMode} />;
};

const app = render(<Test />);
setTimeout(() => app.unmount(), 500);
app.waitUntilExit().then(() => console.log('exited'));
