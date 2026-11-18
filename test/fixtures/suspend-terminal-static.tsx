import React, {useEffect, useRef, useState} from 'react';
import {render, Static, Text, useApp} from '../../src/index.js';

function Test() {
	const {suspendTerminal, exit} = useApp();
	const [items, setItems] = useState(['one']);
	const onCommitRef = useRef<() => void>(undefined);

	useEffect(() => {
		void (async () => {
			await suspendTerminal(async () => {
				// Stands in for background work finishing while an editor or pager owns the terminal.
				setItems(previous => [...previous, 'two']);
				await new Promise<void>(resolve => {
					onCommitRef.current = resolve;
				});
			});

			setItems(previous => [...previous, 'three']);
		})();
	}, [suspendTerminal]);

	// Each phase waits for the commit before it instead of a timer, so the second item is always committed while suspended.
	useEffect(() => {
		onCommitRef.current?.();

		if (items.length === 3) {
			exit();
		}
	}, [items, exit]);

	return (
		<>
			<Static items={items}>{item => <Text key={item}>{item}</Text>}</Static>
			<Text>{items.length} items</Text>
		</>
	);
}

const app = render(<Test />);

await app.waitUntilExit();
