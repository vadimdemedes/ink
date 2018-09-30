import {render} from '../..';

export default (node, stream) => {
	return render(node, {
		stdout: stream,
		debug: true
	});
};
