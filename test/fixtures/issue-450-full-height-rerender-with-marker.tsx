import {runIssue450RerenderFixture} from './issue-450-fixture-helpers.js';

runIssue450RerenderFixture({
	completionMarker: '__FULL_HEIGHT_RERENDER_COMPLETED__',
	heightForFrame: rows => rows,
});
