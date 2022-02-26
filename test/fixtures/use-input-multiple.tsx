import * as React from 'react';
import {render, useInput, useApp, Text} from '../..';

const App: React.FC = () => {
	const {exit} = useApp();
	const [input, setInput] = React.useState('');

	const handleInput = React.useCallback((input: string) => {
		setInput((previousInput: string) => previousInput + input);
	}, []);

	useInput(handleInput);
	useInput(handleInput, {isActive: false});

	React.useEffect(() => {
		setTimeout(exit, 1000);
	}, []);

	return <Text>{input}</Text>;
};

const app = render(<App />);

(async () => {
	await app.waitUntilExit();
	console.log('exited');
})();
