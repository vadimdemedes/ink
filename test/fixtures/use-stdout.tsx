import React, {FC, useEffect} from 'react';
import {render, useStdout, Text} from '../..';

const WriteToStdout: FC = () => {
	const {write} = useStdout();

	useEffect(() => {
		write('Hello from Ink to stdout\n');
	}, []);

	return <Text>Hello World</Text>;
};

const app = render(<WriteToStdout />);

(async () => {
	await app.waitUntilExit();
	console.log('exited');
})();
