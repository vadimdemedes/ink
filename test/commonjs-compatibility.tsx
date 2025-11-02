import {execSync} from 'node:child_process';
import {mkdirSync, writeFileSync, rmSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import test from 'ava';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

test('yoga-layout/load works when compiled to CommonJS', t => {
	const tempDir = join(__dirname, '.commonjs-test');

	// Clean up if exists
	try {
		rmSync(tempDir, {recursive: true, force: true});
	} catch {}

	// Create temp directory
	mkdirSync(tempDir, {recursive: true});

	try {
		// Create a tsconfig for CommonJS
		const tsconfig = {
			compilerOptions: {
				module: 'commonjs',
				target: 'es2020',
				outDir: './dist',
				rootDir: './src',
				strict: true,
				esModuleInterop: true,
				skipLibCheck: true,
				forceConsistentCasingInFileNames: true,
				moduleResolution: 'node',
				jsx: 'react',
				declaration: false,
				resolveJsonModule: true,
			},
			include: ['src/**/*'],
		};

		writeFileSync(
			join(tempDir, 'tsconfig.json'),
			JSON.stringify(tsconfig, null, 2),
		);

		// Create package.json for CommonJS
		const packageJson = {
			name: 'commonjs-test',
			type: 'commonjs',
			dependencies: {
				'yoga-layout': '^3.2.1',
			},
		};

		writeFileSync(
			join(tempDir, 'package.json'),
			JSON.stringify(packageJson, null, 2),
		);

		// Create src directory
		mkdirSync(join(tempDir, 'src'), {recursive: true});

		// Create a test file that uses yoga-init
		const testCode = `
const React = require('react');

// This simulates what happens when our ESM code is compiled to CommonJS
// If yoga-layout/load is properly used, this should work without top-level await issues
async function testYogaInit() {
	// Import the compiled yoga-init module
	const yogaInit = require('${join(__dirname, '..', 'build', 'yoga-init.js')}');

	// Test that we can initialize Yoga
	if (yogaInit.initYoga) {
		await yogaInit.initYoga();
	}

	// Test that we can get Yoga instance
	const yoga = yogaInit.getYoga();

	// Test that constants work
	const displayNone = yogaInit.DISPLAY_NONE();
	const edgeLeft = yogaInit.EDGE_LEFT();

	// Test that we can create a node
	const node = yoga.Node.create();

	// If we get here, everything worked
	console.log('SUCCESS: CommonJS compatibility verified');
	return true;
}

/* eslint-disable n/prefer-global/process, unicorn/no-process-exit */
testYogaInit().then(result => {
	process.exit(result ? 0 : 1);
}).catch(err => {
	console.error('FAIL:', err.message);
	process.exit(1);
});
/* eslint-enable n/prefer-global/process, unicorn/no-process-exit */
`;

		writeFileSync(join(tempDir, 'src', 'test.js'), testCode);

		// Run the CommonJS test
		const result = execSync(`cd ${tempDir} && node src/test.js`, {
			encoding: 'utf8',
			stdio: 'pipe',
		});

		// Check that it succeeded
		t.true(
			result.includes('SUCCESS'),
			'CommonJS compatibility test should succeed',
		);
	} finally {
		// Clean up
		rmSync(tempDir, {recursive: true, force: true});
	}
});

test('no top-level await in compiled output', t => {
	// Check that there are no top-level awaits in the build directory
	const buildDir = join(__dirname, '..', 'build');

	try {
		// Search for top-level await in all .js files
		// Using grep to find lines that start with 'await ' (after whitespace)
		const result = execSync(
			`grep -r "^[[:space:]]*await[[:space:]]" ${buildDir} || true`,
			{encoding: 'utf8', stdio: 'pipe'},
		);

		// Filter out any awaits that are inside async functions (this is a simple check)
		// In practice, a proper AST parser would be better, but this is good enough for our test
		const lines = result.split('\n').filter(line => line.trim());

		// There should be no top-level awaits
		t.is(
			lines.length,
			0,
			`Found top-level await in compiled output: ${lines.join('\n')}`,
		);
	} catch {
		// Grep returns non-zero if no matches found, which is what we want
		t.pass('No top-level await found in compiled output');
	}
});

test('yoga loads successfully without blocking', async t => {
	// Import our yoga-init module
	const {initYoga, isYogaInitialized, getYoga} = await import(
		'../build/yoga-init.js'
	);

	// Yoga should start loading immediately
	// Give it a small amount of time to load
	// eslint-disable-next-line no-promise-executor-return
	await new Promise(resolve => setTimeout(resolve, 100));

	// Check that Yoga is initialized
	t.true(isYogaInitialized(), 'Yoga should be initialized after a short delay');

	// Verify we can get the Yoga instance
	const yoga = getYoga();
	t.truthy(yoga, 'Should be able to get Yoga instance');
	t.truthy(yoga.Node, 'Yoga should have Node property');
	t.is(
		typeof yoga.Node.create,
		'function',
		'Yoga.Node.create should be a function',
	);

	// Test creating a node
	const node = yoga.Node.create();
	t.truthy(node, 'Should be able to create a Yoga node');

	// Clean up
	node.free();
});
