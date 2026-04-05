import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import {execSync} from 'node:child_process';
import test from 'ava';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));
const rootDir = path.join(__dirname, '..');
const buildDir = path.join(rootDir, 'build');

const packageJson = JSON.parse(
	fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'),
) as {
	exports: {types: string; default: string};
};

test.before(() => {
	execSync('npm run build', {cwd: rootDir, stdio: 'pipe'});
});

test('build output files are not nested under build/src/', t => {
	t.false(
		fs.existsSync(path.join(buildDir, 'src')),
		'build/src/ should not exist — files should be directly in build/',
	);
});

test('package.json export paths resolve to existing files', t => {
	const {exports} = packageJson;
	const typesPath = path.join(rootDir, exports.types);
	const defaultPath = path.join(rootDir, exports.default);

	t.true(
		fs.existsSync(typesPath),
		`Types export path does not exist: ${exports.types}`,
	);
	t.true(
		fs.existsSync(defaultPath),
		`Default export path does not exist: ${exports.default}`,
	);
});

test('build/index.js and build/index.d.ts exist', t => {
	t.true(
		fs.existsSync(path.join(buildDir, 'index.js')),
		'build/index.js should exist',
	);
	t.true(
		fs.existsSync(path.join(buildDir, 'index.d.ts')),
		'build/index.d.ts should exist',
	);
});

test('tsconfig.json include only contains src', t => {
	const tsconfig = JSON.parse(
		fs.readFileSync(path.join(rootDir, 'tsconfig.json'), 'utf8'),
	) as {include: string[]};

	t.deepEqual(
		tsconfig.include,
		['src'],
		'tsconfig.json include should only contain "src" to avoid nested build output',
	);
});
