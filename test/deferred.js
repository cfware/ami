import t from 'libtap';

import {Deferred} from '../lib/deferred.js';

t.test('resolve', async t => {
	const def = new Deferred();
	def.resolve('result');
	t.equal(await def.promise, 'result');
});

t.test('reject', async t => {
	const def = new Deferred();
	def.reject('error');
	await t.rejects(def.promise, 'error');
});
