import t from 'libtap';

import * as actionid from '../lib/actionid.js';

t.test('basic', async t => {
	t.strictSame(Object.keys(actionid).sort(), ['actionAutoID', 'actionIgnore']);
	t.type(actionid.actionIgnore, 'string');
	t.type(actionid.actionAutoID, 'function');
	const id1 = actionid.actionAutoID();
	const id2 = actionid.actionAutoID();
	t.equal(id1, id2.replace(/2$/u, '1'));
});
