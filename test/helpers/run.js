import {spawn} from 'node-pty';

export default (fixture, {env} = {}) => {
	return new Promise((resolve, reject) => {
		const term = spawn('node', [`${__dirname}/../fixtures/run`, `./${fixture}`], {
			name: 'xterm-color',
			cols: 100,
			cwd: __dirname,
			env: {
				...process.env,
				...env
			}
		});

		let output = '';

		term.on('data', data => {
			output += data;
		});

		term.on('exit', code => {
			if (code === 0) {
				resolve(output);
				return;
			}

			reject(new Error(`Process exited with a non-zero code: ${output}`));
		});
	});
};
