import t from 'libtap';

import {astTrue} from '../lib/ast-true.js';

t.test('ast-true', async t => {
	const trueValues = new Set([
		'yes',
		'true',
		'y',
		't',
		'1',
		'on',
		true,
		1
	]);
	const falseValues = new Set([
		'no',
		'false',
		'n',
		'f',
		'0',
		'off',
		false,
		0,
		2,
		{},
		[],
		'purple-people-eater'
	]);

	for (const value of trueValues) {
		t.equal(astTrue(value), true, `astTrue(${JSON.stringify(value)})`);
	}

	for (const value of falseValues) {
		t.equal(astTrue(value), false, `!astTrue(${JSON.stringify(value)})`);
	}
});
