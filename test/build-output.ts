import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import {execSync} from 'node:child_process';
import test, {before, type TestContext} from 'node:test';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));
const rootDir = path.join(__dirname, '..');
const buildDir = path.join(rootDir, 'build');

const packageJson = JSON.parse(
	fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'),
) as {
	exports: {types: string; default: string};
};

before(() => {
	fs.rmSync(buildDir, {recursive: true, force: true});
	execSync('npm run build', {cwd: rootDir, stdio: 'pipe'});
});

test('build output files are not nested under build/src/', (t: TestContext) => {
	t.assert.strictEqual(
		fs.existsSync(path.join(buildDir, 'src')),
		false,
		'build/src/ should not exist — files should be directly in build/',
	);
});

test('package.json export paths resolve to existing files', (t: TestContext) => {
	const {exports} = packageJson;
	const typesPath = path.join(rootDir, exports.types);
	const defaultPath = path.join(rootDir, exports.default);

	t.assert.ok(
		fs.existsSync(typesPath),
		`Types export path does not exist: ${exports.types}`,
	);
	t.assert.ok(
		fs.existsSync(defaultPath),
		`Default export path does not exist: ${exports.default}`,
	);
});

test('build/index.js and build/index.d.ts exist', (t: TestContext) => {
	t.assert.ok(
		fs.existsSync(path.join(buildDir, 'index.js')),
		'build/index.js should exist',
	);
	t.assert.ok(
		fs.existsSync(path.join(buildDir, 'index.d.ts')),
		'build/index.d.ts should exist',
	);
});

test('tsconfig.json include only contains src', (t: TestContext) => {
	const tsconfig = JSON.parse(
		fs.readFileSync(path.join(rootDir, 'tsconfig.json'), 'utf8'),
	) as {include: string[]};

	t.assert.deepStrictEqual(
		tsconfig.include,
		['src'],
		'tsconfig.json include should only contain "src" to avoid nested build output',
	);
});
