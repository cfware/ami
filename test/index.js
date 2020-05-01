import t from 'libtap';

import {Socket} from '../lib/socket.js';
// eslint-disable-next-line import/no-unresolved
import AMISocket from 'ami';

t.test('expected export', async t => {
	t.equal(AMISocket, Socket);
});
