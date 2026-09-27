import test from 'ava';
import ts from 'typescript';

test('Box width constraints only accept numbers', t => {
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
	t.deepEqual(
		diagnostics.map(diagnostic =>
			ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
		),
		[],
	);
});
