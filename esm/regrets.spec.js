import {test} from 'tap';
import fromEntries from 'fromentries';

import * as regrets from './regrets.js';

function type(obj) {
	const proto = Object.getPrototypeOf(obj);
	if (!proto) {
		return typeof obj;
	}

	return proto.constructor.name;
}

test('exports', async t => {
	t.matchSnapshot(
		fromEntries(
			Object.entries(regrets)
				.map(([name, value]) => [
					name,
					`${type(value)}(${JSON.stringify(value.toString())})`
				])
		)
	);
});
