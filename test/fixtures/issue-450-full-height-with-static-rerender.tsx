import {runIssue450RerenderFixture} from './issue-450-fixture-helpers.js';

runIssue450RerenderFixture({
	includeStaticLine: true,
	heightForFrame: rows => rows,
});
