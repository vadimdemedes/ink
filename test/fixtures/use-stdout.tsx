import * as React from 'react';
import {render, useStdout, Text} from '../..';

const WriteToStdout: React.FC = () => {
	const {write} = useStdout();

	React.useEffect(() => {
		write('Hello from Ink to stdout\n');
	}, []);

	return <Text>Hello World</Text>;
};

const app = render(<WriteToStdout />);

(async () => {
	await app.waitUntilExit();
	console.log('exited');
})();
