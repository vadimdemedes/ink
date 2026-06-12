import process from 'node:process';

// Simulate a Windows console. This must happen before Ink is imported, since
// the platform is read at module load time.
Object.defineProperty(process, 'platform', {value: 'win32'});

const {runIssue450RerenderFixture} =
	await import('./issue-450-fixture-helpers.js');

runIssue450RerenderFixture({
	heightForFrame: rows => rows,
});
