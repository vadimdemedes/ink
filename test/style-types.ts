import test, {type TestContext} from 'node:test';
import ts from 'typescript';

test('Box width constraints only accept numbers', (t: TestContext) => {
	const program = ts.createProgram(
		['src/global.d.ts', 'test/fixtures/box-width-types.tsx'],
		{
			noEmit: true,
			strict: true,
			skipLibCheck: true,
			module: ts.ModuleKind.NodeNext,
			jsx: ts.JsxEmit.React,
		},
	);

	const diagnostics = ts.getPreEmitDiagnostics(program);
	t.assert.deepStrictEqual(
		diagnostics.map(diagnostic =>
			ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
		),
		[],
	);
});
