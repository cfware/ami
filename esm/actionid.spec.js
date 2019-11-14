import {test} from 'tap';

import * as actionid from './actionid.js';

test('basic', async t => {
	t.strictSame(Object.keys(actionid).sort(), ['actionAutoID', 'actionIgnore']);
	t.type(actionid.actionIgnore, 'string');
	t.type(actionid.actionAutoID, 'function');
	const id1 = actionid.actionAutoID();
	const id2 = actionid.actionAutoID();
	t.is(id1, id2.replace(/2$/, '1'));
});
