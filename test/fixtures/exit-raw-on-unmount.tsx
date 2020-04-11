import React from 'react';
import {render, Box, StdinContext} from '../../src';

class Test extends React.Component<{
	onSetRawMode: (value: boolean) => void;
}> {
	render() {
		return <Box>Hello World</Box>;
	}

	componentDidMount() {
		this.props.onSetRawMode(true);
	}
}

const app = render(
	<StdinContext.Consumer>
		{({setRawMode}) => <Test onSetRawMode={setRawMode} />}
	</StdinContext.Consumer>,
	{
		experimental: process.env.EXPERIMENTAL === 'true'
	}
);

setTimeout(() => app.unmount(), 500);
app.waitUntilExit().then(() => console.log('exited'));
