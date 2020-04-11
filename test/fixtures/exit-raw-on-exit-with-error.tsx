import React from 'react';
import {render, Box, AppContext, StdinContext} from '../../src';

class Test extends React.Component<{
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

const app = render(
	<AppContext.Consumer>
		{({exit}) => (
			<StdinContext.Consumer>
				{({setRawMode}) => <Test onExit={exit} onSetRawMode={setRawMode} />}
			</StdinContext.Consumer>
		)}
	</AppContext.Consumer>,
	{
		experimental: process.env.EXPERIMENTAL === 'true'
	}
);

app.waitUntilExit().catch(error => console.log(error.message));
