/* eslint-disable @typescript-eslint/naming-convention */
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {dirname, join} from 'node:path';
import initYoga from 'yoga-wasm-web';

const Yoga = await initYoga(
	fs.readFileSync(
		join(
			dirname(
				createRequire(import.meta.url).resolve('yoga-wasm-web/package.json')
			),
			'dist/yoga.wasm'
		)
	)
);

export default Yoga;
export * from 'yoga-wasm-web';
export type {Node as YogaNode} from 'yoga-wasm-web';
