import React, {useState, useEffect, useRef} from 'react';
import {render, Text} from '../../src/index.js';

function Test() {
	const [counter, setCounter] = useState(0);
	const timerRef = useRef<NodeJS.Timeout>(undefined);

	useEffect(() => {
		const onTimeout = () => {
			setCounter(previous => {
				if (previous > 4) {
					return previous;
				}

				timerRef.current = setTimeout(onTimeout, 20);
				return previous + 1;
			});
		};

		timerRef.current = setTimeout(onTimeout, 20);

		return () => {
			clearTimeout(timerRef.current);
		};
	}, []);

	return <Text>Counter: {counter}</Text>;
}

render(<Test />);
