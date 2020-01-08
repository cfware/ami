import {promisify} from 'util';

import t from 'libtap';

import {Socket} from '../lib/socket.js';

const delay = promisify(setTimeout);

t.test('basic instance', async t => {
	const socket = new Socket();
	t.equal(socket.connected, false);
	t.equal(socket.authenticated, false);
	t.equal(socket.amiVersion, undefined);
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
	const events = [];
	const socket = new Socket();
	socket.on('event', packet => events.push(packet.asObject));

	let ping1Done = false;
	// eslint-disable-next-line promise/prefer-await-to-then
	socket.ping().then(() => {
		ping1Done = true;
	});

	let ping2Done = false;
	// eslint-disable-next-line promise/prefer-await-to-then
	socket.send({action: 'ping'}, {ignoreResponse: true}).then(() => {
		ping2Done = true;
	});

	await socket.connect();
	t.equal(socket.authenticated, true);
	t.equal(socket.connected, true);
	t.match(socket.amiVersion, /^\d+\.\d+\.\d+$/u);
	t.equal(ping2Done, true);

	await delay(100);
	t.equal(ping1Done, true);

	await t.rejects(socket.connect(), new Error('Disconnect first'));

	const {ping} = await socket.send({action: 'ping'});
	t.equal(ping, 'Pong');

	const categories = await socket.getList({action: 'CoreShowChannels'});
	t.equal(categories.length, 2);
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

	t.equal(socket.connected, false);
	t.equal(socket.authenticated, false);
	t.equal(socket.amiVersion, undefined);

	await t.rejects(failPing, new Error('Disconnected'));
	t.equal(events.length, 2);
	t.strictSame(events.filter(({event}) => event === 'FullyBooted')[0], {
		event: 'FullyBooted',
		privilege: 'system,all',
		status: 'Fully Booted'
	});
	t.match(events.filter(({event}) => event === 'SuccessfulAuth')[0], {
		event: 'SuccessfulAuth',
		privilege: 'security,all',
		severity: 'Informational',
		service: 'AMI',
		accountid: 'local'
	});
});
