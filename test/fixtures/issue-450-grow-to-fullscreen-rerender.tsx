import {runIssue450RerenderFixture} from './issue-450-fixture-helpers.js';

runIssue450RerenderFixture({
	completionMarker: '__GROW_TO_FULLSCREEN_RERENDER_COMPLETED__',
	heightForFrame: (rows, frameCount) => (frameCount < 2 ? rows - 1 : rows),
});
