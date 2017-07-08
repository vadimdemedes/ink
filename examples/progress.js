/* @jsx h */
const {h, mount, Component, Text, ProgressBar} = require('../');

const MAX = 20;

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
				<ProgressBar
					blue
					left={text.length}
					percent={this.state.i / MAX}
					/>
			</div>
		);
	}

	componentDidMount() {
		this.timer = setInterval(() => {
			const i = this.state.i + 1;
			this.setState({i}, () => {
				if (i === MAX) {
					// eslint-disable-next-line unicorn/no-process-exit
					process.exit();
				}
			});
		}, 100);
	}

	componentWillUnmount() {
		clearInterval(this.timer);
	}
}

mount(<ProgressApp/>, process.stdout);

