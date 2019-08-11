/* eslint-disable react/prop-types */
'use strict';
const React = require('react');
const {render, Box, AppContext, StdinContext} = require('../..');

class Test extends React.Component {
	render() {
		return (
			<Box>Hello World</Box>
		);
	}

	componentDidMount() {
		this.props.onSetRawMode(true);
		setTimeout(this.props.onExit, 500);
	}
}

const app = render((
	<AppContext.Consumer>
		{({exit}) => (
			<StdinContext.Consumer>
				{({setRawMode}) => (
					<Test onExit={exit} onSetRawMode={setRawMode}/>
				)}
			</StdinContext.Consumer>
		)}
	</AppContext.Consumer>
), {
	experimental: process.env.EXPERIMENTAL === 'true'
});

app.waitUntilExit().then(() => console.log('exited'));
