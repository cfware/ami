import {promisify} from 'util';

import t from 'tap';

import {Socket} from './socket.js';

const delay = promisify(setTimeout);

t.test('basic instance', async t => {
	const socket = new Socket();
	t.is(socket.connected, false);
	t.is(socket.authenticated, false);
	t.is(socket.amiVersion, undefined);
	socket.disconnect();
});

t.test('bad credentials', async t => {
	const socket = new Socket({
		credentials: {
			username: 'invalid',
			secret: 'invalid'
		}
	});

	const ping = socket.ping();
	await t.rejects(socket.connect(), Object.assign(new Error('Authentication failed'), {
		request: {
			response: {
				response: 'Error',
				message: 'Authentication failed'
			}
		}
	}));
	await t.rejects(ping, new Error('Disconnected'));
});

t.test('connect error', async t => {
	const socket = new Socket({
		connect: {
			port: 5039
		}
	});

	const ping = socket.ping();
	await t.rejects(socket.connect(), Object.assign(new Error('Connection Error'), {
		request: undefined
	}));
	await t.rejects(ping, new Error('Connection Error'));
});

t.test('basic session', async t => {
	const socket = new Socket();

	let ping1Done = false;
	socket.ping().then(() => {
		ping1Done = true;
	});

	let ping2Done = false;
	socket.send({action: 'ping'}, {ignoreResponse: true}).then(() => {
		ping2Done = true;
	});

	await socket.connect();
	t.is(socket.authenticated, true);
	t.is(socket.connected, true);
	t.match(socket.amiVersion, /^\d+\.\d+\.\d+$/);
	t.is(ping2Done, true);

	await delay(100);
	t.is(ping1Done, true);

	await t.rejects(socket.connect(), new Error('Disconnect first'));

	const {ping} = await socket.send({action: 'ping'});
	t.is(ping, 'Pong');

	const categories = await socket.getList({action: 'CoreShowChannels'});
	t.is(categories.length, 2);
	t.match(categories, [
		{
			response: 'Success',
			eventlist: 'start',
			message: 'Channels will follow'
		},
		{
			event: 'CoreShowChannelsComplete',
			eventlist: 'Complete',
			listitems: '0'
		}
	]);

	const failPing = socket.ping();
	socket.disconnect();

	t.is(socket.connected, false);
	t.is(socket.authenticated, false);
	t.is(socket.amiVersion, undefined);

	await t.rejects(failPing, new Error('Disconnected'));
});
