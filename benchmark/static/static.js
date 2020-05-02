/* eslint-disable react/jsx-curly-brace-presence */
'use strict';
const React = require('react');
const {render, Static, Box, Color, Text} = require('../..');
const Spinner = require('ink-spinner').default;

const App = () => {
	const [items, setItems] = React.useState([]);
	const [showSpinner, setShowSpinner] = React.useState(true);
	const itemCountRef = React.useRef(0);

	React.useEffect(() => {
		let timer;

		const run = () => {
			if (itemCountRef.current++ > 1000) {
				setShowSpinner(false);
				return;
			}

			setItems(previousItems => [
				...previousItems,
				{
					id: previousItems.length
				}
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
						<Color green>Item #{index}</Color>
						<Text>Item content</Text>
					</Box>
				)}
			</Static>

			<Box flexDirection="column" padding={1}>
				<Text underline bold>
					<Color red>
						{'Hello'} {'World'}
					</Color>
				</Text>

				{showSpinner && <Spinner type="dots" />}
				<Text>Rendered: {items.length}</Text>

				<Box marginTop={1} width={60}>
					Cupcake ipsum dolor sit amet candy candy. Sesame snaps cookie I love
					tootsie roll apple pie bonbon wafer. Caramels sesame snaps icing
					cotton candy I love cookie sweet roll. I love bonbon sweet.
				</Box>

				<Box marginTop={1} flexDirection="column">
					<Color bgWhite black>
						Colors:
					</Color>

					<Box flexDirection="column" paddingLeft={1}>
						<Text>
							- <Color red>Red</Color>
						</Text>
						<Text>
							- <Color blue>Blue</Color>
						</Text>
						<Text>
							- <Color green>Green</Color>
						</Text>
					</Box>
				</Box>
			</Box>
		</Box>
	);
};

render(<App />);
