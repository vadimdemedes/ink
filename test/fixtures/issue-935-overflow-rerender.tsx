import process from 'node:process';
import {runIssue450RerenderFixture} from './issue-450-fixture-helpers.js';

// Pre-existing terminal output that must survive Ink's full-clear fallback.
const rowsArgument = Number(process.argv[2]);
const rows =
	rowsArgument === 0 || Number.isNaN(rowsArgument) ? 6 : rowsArgument;
for (let index = 0; index < rows; index++) {
	process.stdout.write(`#935 scrollback ${index}\n`);
}

runIssue450RerenderFixture({
	// Overflow by exactly one row: only the top row scrolls into scrollback per
	// frame, so the label row below it stays in the viewport, where a full clear
	// erases it before the next frame is written.
	heightForFrame: terminalRows => terminalRows + 1,
	// One frame's label is longer than the others, so an incomplete clear leaves
	// its tail behind (`#450 topSTALE-ROW`) instead of being overwritten.
	labelForFrame: frameCount =>
		frameCount === 7 ? 'frame 7 STALE-ROW' : `frame ${frameCount}`,
});
