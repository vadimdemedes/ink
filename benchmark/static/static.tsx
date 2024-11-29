import React from 'react';
import {render, Box, Text, Static} from '../../src/index.js';

function App() {
	const [items, setItems] = React.useState<
		Array<{
			id: number;
		}>
	>([]);
	const itemCountReference = React.useRef(0);

	React.useEffect(() => {
		let timer: NodeJS.Timeout | undefined;

		const run = () => {
			if (itemCountReference.current++ > 1000) {
				return;
			}

			setItems(previousItems => [
				...previousItems,
				{
					id: previousItems.length,
				},
			]);

			timer = setTimeout(run, 10);
		};

		run();

		return () => {
			clearTimeout(timer);
		};
	}, []);

	return (
		<Box flexDirection="column">
			<Static items={items}>
				{(item, index) => (
					<Box key={item.id} padding={1} flexDirection="column">
						<Text color="green">Item #{index}</Text>
						<Text>Item content</Text>
					</Box>
				)}
			</Static>

			<Box flexDirection="column" padding={1}>
				<Text underline bold color="red">
					{/* eslint-disable-next-line react/jsx-curly-brace-presence */}
					{'Hello World'}
				</Text>

				<Text>Rendered: {items.length}</Text>

				<Box marginTop={1} width={60}>
					<Text>
						Cupcake ipsum dolor sit amet candy candy. Sesame snaps cookie I love
						tootsie roll apple pie bonbon wafer. Caramels sesame snaps icing
						cotton candy I love cookie sweet roll. I love bonbon sweet.
					</Text>
				</Box>

				<Box marginTop={1} flexDirection="column">
					<Text backgroundColor="white" color="black">
						Colors:
					</Text>

					<Box flexDirection="column" paddingLeft={1}>
						<Text>
							- <Text color="red">Red</Text>
						</Text>
						<Text>
							- <Text color="blue">Blue</Text>
						</Text>
						<Text>
							- <Text color="green">Green</Text>
						</Text>
					</Box>
				</Box>
			</Box>
		</Box>
	);
}

render(<App />);
