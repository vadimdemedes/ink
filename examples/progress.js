/* @jsx h */
const {h, mount, Component, Text, Bar} = require('../');

class ProgressApp extends Component {
	constructor() {
		super();

		this.state = {
			i: 0
		};
	}

	render() {
		const text = `Running `;
		return (
			<div>
				<Text green>
					{text}
				</Text>
				<Bar
					left={text.length}
					percent={this.state.i / 100}
				/>
			</div>
		);
	}

	componentDidMount() {
		this.timer = setInterval(() => {
			this.setState({
				i: this.state.i + 1
			});
		}, 100);
	}

	componentWillUnmount() {
		clearInterval(this.timer);
	}
}

mount(<ProgressApp/>, process.stdout);

