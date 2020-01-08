import t from 'libtap';

import {Socket} from '../lib/socket.js';
import AMISocket from '../lib/index.js';

t.test('expected export', async t => {
	t.equal(AMISocket, Socket);
});
