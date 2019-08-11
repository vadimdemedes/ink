/* eslint-disable react/prop-types */
'use strict';
const React = require('react');
const {render, Box, StdinContext} = require('../..');

class Test extends React.Component {
	render() {
		return (
			<Box>Hello World</Box>
		);
	}

	componentDidMount() {
		this.props.onSetRawMode(true);
	}
}

const app = render((
	<StdinContext.Consumer>
		{({setRawMode}) => (
			<Test onSetRawMode={setRawMode}/>
		)}
	</StdinContext.Consumer>
), {
	experimental: process.env.EXPERIMENTAL === 'true'
});

setTimeout(() => app.unmount(), 500);
app.waitUntilExit().then(() => console.log('exited'));
