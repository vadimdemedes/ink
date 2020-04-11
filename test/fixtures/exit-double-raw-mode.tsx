import React from 'react';
import {Box, render, StdinContext} from '../../src';

class ExitDoubleRawMode extends React.Component<{
	setRawMode: (value: boolean) => void;
}> {
	render() {
		return <Box>Hello World</Box>;
	}

	componentDidMount() {
		const {setRawMode} = this.props;

		setRawMode(true);

		setTimeout(() => {
			setRawMode(false);
			setRawMode(true);
		}, 500);
	}
}

const {unmount, waitUntilExit} = render(
	<StdinContext.Consumer>
		{({setRawMode}) => <ExitDoubleRawMode setRawMode={setRawMode}/>}
	</StdinContext.Consumer>,
	{
		experimental: process.env.EXPERIMENTAL === 'true'
	}
);

process.stdin.on('data', data => {
	if (String(data) === 'q') {
		unmount();
	}
});

waitUntilExit().then(() => console.log('exited'));
