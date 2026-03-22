import React, {useState, useEffect, useRef} from 'react';
import {render, Static, Text} from '../../src/index.js';

function Test() {
	const [items, setItems] = useState<string[]>([]);
	const [counter, setCounter] = useState(0);
	const counterRef = useRef(0);
	const timerRef = useRef<NodeJS.Timeout>(undefined);

	useEffect(() => {
		const onTimeout = () => {
			if (counterRef.current > 4) {
				return;
			}

			counterRef.current += 1;
			setCounter(counterRef.current);
			setItems(prevItems => [...prevItems, `#${counterRef.current}`]);
			timerRef.current = setTimeout(onTimeout, 20);
		};

		timerRef.current = setTimeout(onTimeout, 20);

		return () => {
			clearTimeout(timerRef.current);
		};
	}, []);

	return (
		<>
			<Static items={items}>{item => <Text key={item}>{item}</Text>}</Static>

			<Text>Counter: {counter}</Text>
		</>
	);
}

render(<Test />);
