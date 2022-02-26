import * as React from 'react';
import {Text, render} from '../..';

const App = () => {
	React.useEffect(() => {
		const timer = setTimeout(() => {}, 1000);

		return () => {
			clearTimeout(timer);
		};
	}, []);

	return <Text>Hello World</Text>;
};

const {unmount} = render(<App />);
console.log('First log');
unmount();
console.log('Second log');
