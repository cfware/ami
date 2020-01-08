import t from 'libtap';

import {getSingleOption} from '../lib/get-single-option.js';

t.test('export', async t => {
	t.type(getSingleOption, 'function');
});

t.test('basic functionality', async t => {
	const object = {
		action: 'test',
		duplicatekey: 'value',
		duplicateKey: 'value',
		nonString: {}
	};

	t.equal(getSingleOption(object, 'action'), 'test', 'gets direct matching key');
	t.equal(getSingleOption(object, 'Action'), 'test', 'gets direct off case matching key');
	t.equal(getSingleOption(object, 'nonString'), object.nonString, 'gets non-string');
	t.equal(getSingleOption(object, 'nonstring'), object.nonString, 'gets non-string off case');
	t.throws(
		() => getSingleOption(object, 'duplicatekey'),
		new TypeError('Must provide a single `duplicatekey` value'),
		'Requesting duplicatekey fails'
	);
	t.throws(
		() => getSingleOption(object, 'DuplicateKey'),
		new TypeError('Must provide a single `DuplicateKey` value'),
		'Requesting DuplicateKey fails'
	);
});
