import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import test, {type TestContext} from 'node:test';
import ts from 'typescript';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));
const rootDir = path.join(__dirname, '..');
const readme = fs.readFileSync(path.join(rootDir, 'readme.md'), 'utf8');

const sourceFiles = fs
	.readdirSync(path.join(rootDir, 'src'), {recursive: true, encoding: 'utf8'})
	.filter(file => /\.tsx?$/.test(file))
	.map(file =>
		ts.createSourceFile(
			path.join('src', file),
			fs.readFileSync(path.join(rootDir, 'src', file), 'utf8'),
			ts.ScriptTarget.Latest,
			true,
		),
	);

const visit = (node: ts.Node, callback: (node: ts.Node) => void): void => {
	callback(node);
	ts.forEachChild(node, child => {
		visit(child, callback);
	});
};

const getDefault = (node: ts.Node): string | undefined => {
	const tag = ts.getJSDocTags(node).find(tag => tag.tagName.text === 'default');
	return tag ? ts.getTextOfJSDocComment(tag.comment)?.trim() : undefined;
};

const isExpression = (text: string): boolean => {
	const sourceFile = ts.createSourceFile(
		'default.ts',
		`(${text});`,
		ts.ScriptTarget.Latest,
	);

	// @ts-expect-error - `parseDiagnostics` is internal.
	const diagnostics = sourceFile.parseDiagnostics as unknown[];
	return diagnostics.length === 0 && sourceFile.statements.length === 1;
};

test('`@default` tags contain a value, not a sentence', (t: TestContext) => {
	const invalid: string[] = [];

	for (const sourceFile of sourceFiles) {
		visit(sourceFile, node => {
			const value = getDefault(node);
			if (value === undefined || isExpression(value)) {
				return;
			}

			const {line} = sourceFile.getLineAndCharacterOfPosition(node.getStart());
			invalid.push(`${sourceFile.fileName}:${line + 1}: ${value}`);
		});
	}

	t.assert.deepStrictEqual(invalid, []);
});

const getReadmeOptions = (heading: string): Map<string, string | undefined> => {
	const start = readme.indexOf(`\n${heading}\n`);
	const rest = readme.slice(start + heading.length + 2);
	const end = rest.search(/^#{1,4} /m);
	const section = end === -1 ? rest : rest.slice(0, end);
	const options = new Map<string, string | undefined>();

	for (const {groups} of section.matchAll(
		/^#{6} (?<name>\w+)\n(?<body>[\s\S]*?)(?=^#{5,6} |(?![\s\S]))/gm,
	)) {
		options.set(
			groups!['name']!,
			/^Default: `(?<value>.+?)`/m.exec(groups!['body']!)?.groups?.['value'],
		);
	}

	return options;
};

for (const [typeName, heading] of [
	['RenderOptions', '#### render(tree, options?)'],
	['RenderToStringOptions', '#### renderToString(tree, options?)'],
] as const) {
	test(`\`${typeName}\` matches the readme`, (t: TestContext) => {
		const readmeOptions = getReadmeOptions(heading);
		const problems: string[] = [];

		for (const sourceFile of sourceFiles) {
			visit(sourceFile, node => {
				if (
					!ts.isTypeAliasDeclaration(node) ||
					node.name.text !== typeName ||
					!ts.isTypeLiteralNode(node.type)
				) {
					return;
				}

				for (const member of node.type.members) {
					if (!ts.isPropertySignature(member)) {
						continue;
					}

					const name = member.name.getText(sourceFile);
					if (!readmeOptions.has(name)) {
						problems.push(`\`${name}\` is not documented in the readme`);
						continue;
					}

					const typeDefault = getDefault(member);
					const readmeDefault = readmeOptions.get(name);
					if (
						typeDefault !== undefined &&
						readmeDefault !== undefined &&
						typeDefault !== readmeDefault
					) {
						problems.push(
							`\`${name}\` defaults to \`${typeDefault}\` in the TS docs but \`${readmeDefault}\` in the readme`,
						);
					}
				}
			});
		}

		t.assert.ok(readmeOptions.size > 0, `Missing readme section: ${heading}`);
		t.assert.deepStrictEqual(problems, []);
	});
}
