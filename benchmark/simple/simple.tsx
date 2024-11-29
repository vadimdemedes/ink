import React from 'react';
import {render, Box, Text} from '../../src/index.js';

function App() {
	return (
		<Box flexDirection="column" padding={1}>
			<Text underline bold color="red">
				{/* eslint-disable-next-line react/jsx-curly-brace-presence */}
				{'Hello World'}
			</Text>

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
	);
}

const {rerender} = render(<App />);

for (let index = 0; index < 100_000; index++) {
	rerender(<App />);
}
