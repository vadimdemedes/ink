import React from 'react';
import {Text, render, useStdin} from '../../src/index.js';

class ExitDoubleRawMode extends React.Component<{
	setRawMode: (value: boolean) => void;
}> {
	override render() {
		return <Text>Hello World</Text>;
	}

	override componentDidMount() {
		const {setRawMode} = this.props;

		setRawMode(true);

		setTimeout(() => {
			setRawMode(false);
			setRawMode(true);

			// Start the test
			process.stdout.write('s');
		}, 500);
	}
}

const Test = () => {
	const {setRawMode} = useStdin();

	return <ExitDoubleRawMode setRawMode={setRawMode} />;
};

const {unmount, waitUntilExit} = render(<Test />);

process.stdin.on('data', data => {
	if (String(data) === 'q') {
		unmount();
	}
});

waitUntilExit().then(() => console.log('exited'));
