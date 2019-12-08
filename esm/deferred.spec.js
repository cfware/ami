import t from 'tap';

import {Deferred} from './deferred.js';

t.test('resolve', async t => {
	const def = new Deferred();
	def.resolve('result');
	t.is(await def.promise, 'result');
});

t.test('reject', async t => {
	const def = new Deferred();
	def.reject('error');
	await t.rejects(def.promise, 'error');
});
