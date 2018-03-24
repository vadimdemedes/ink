const {h, render, Component, Text} = require('../');

class Counter extends Component {
	constructor() {
		super();

		this.state = {
			i: 0
		};
	}

	render() {
		return h('div', {}, [
			h('div', {}, []),
			h('div', {}, [
				h(Text, {blue: true}, '~/Projects/ink ')
			]),
			h('div', {}, [
				h(Text, {red: true}, 'λ '),
				h(Text, {green: true}, 'node '),
				h(Text, {}, 'media/example'),
			]),
			h(Text, {green: true}, `${this.state.i} tests passed`)
		])

	}

	componentDidMount() {
		this.timer = setInterval(() => {
			if (this.state.i === 50) {
				process.exit(0);
			}

			this.setState({
				i: this.state.i + 1
			});
		}, 100);
	}

	componentWillUnmount() {
		clearInterval(this.timer);
	}
}

render(h(Counter));
