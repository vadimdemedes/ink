import { spawn } from "node-pty";

type Run = (
	fixture: string,
	props?: { env?: Record<string, unknown> }
) => Promise<any>;

const run: Run = (fixture, props) => {
	return new Promise((resolve, reject) => {
		const term = spawn("ts-node", [`${__dirname}/../fixtures/${fixture}.tsx`], {
			name: "xterm-color",
			cols: 100,
			cwd: __dirname,
			env: {
				...process.env,
				...props?.env && {}
			}
		});

		let output = "";

		term.on("data", data => {
			output += data;
		});

		term.on("exit", code => {
			if (code === 0) {
				resolve(output);
				return;
			}

			reject(new Error(`Process exited with a non-zero code: ${output}`));
		});
	});
};

export default run;
