import Instance from './instance';
import instances from './instances';

export default (node, options = {}) => {
	// Stream was passed instead of `options` object
	if (typeof options.write === 'function') {
		options = {
			stdout: options,
			stdin: process.stdin
		};
	}

	options = {
		stdout: process.stdout,
		stdin: process.stdin,
		debug: false,
		exitOnCtrlC: true,
		...options
	};

	let instance;
	if (instances.has(options.stdout)) {
		instance = instances.get(options.stdout);
	} else {
		instance = new Instance(options);
		instances.set(options.stdout, instance);
	}

	instance.render(node);

	return {
		rerender: instance.render,
		unmount: () => instance.unmount(),
		waitUntilExit: instance.waitUntilExit,
		cleanup: () => instances.delete(options.stdout)
	};
};
