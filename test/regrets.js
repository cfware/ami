import t from 'libtap';

import * as regrets from '../lib/regrets.js';

function type(object) {
	const proto = Object.getPrototypeOf(object);
	if (!proto) {
		return typeof object;
	}

	return proto.constructor.name;
}

t.test('exports', async t => {
	t.matchSnapshot(
		Object.fromEntries(
			Object.entries(regrets)
				.map(([name, value]) => [
					name,
					`${type(value)}(${JSON.stringify(value.toString())})`
				])
		)
	);
});
