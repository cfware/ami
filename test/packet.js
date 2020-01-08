import t from 'libtap';

import {Packet} from '../lib/packet.js';

t.test('constructor without text', async t => {
	const packet = new Packet();
	t.type(packet, Packet);
	t.equal(packet.toString(), '');
	t.strictSame(packet.values, []);
	t.strictSame(packet.value('action'), []);
});

t.test('constructor with text', async t => {
	const packet = new Packet('Action: Originate\r\nChannel: Local/1234@default');
	t.equal(packet.toString(), 'action: Originate\r\nchannel: Local/1234@default\r\n\r\n');
	t.strictSame(packet.values, [
		['action', 'Originate'],
		['channel', 'Local/1234@default']
	]);
	t.strictSame(packet.asObject, {
		action: 'Originate',
		channel: 'Local/1234@default'
	});
	t.strictSame(packet.value('action'), ['Originate']);
	t.strictSame(packet.value('ACTION'), ['Originate']);
	t.strictSame(packet.flatValue('action'), 'Originate');
	t.strictSame(packet.flatValue('ACTION'), 'Originate');
	packet.append('Added', 'value');

	t.equal(packet.toString(), 'action: Originate\r\nchannel: Local/1234@default\r\nadded: value\r\n\r\n');
	packet.assign({another: 'value'});
	t.equal(packet.toString(), 'action: Originate\r\nchannel: Local/1234@default\r\nadded: value\r\nanother: value\r\n\r\n');

	packet.assign({action: 'varset'}, true);
	t.equal(packet.toString(), 'action: varset\r\n\r\n');

	packet.append('variable', 'NAME1=VALUE1');
	t.equal(packet.flatValue('variable'), 'NAME1=VALUE1');
	packet.append('variable', 'NAME2=VALUE2');
	packet.append('variable', 'NAME3=VALUE3');
	t.strictSame(packet.flatValue('variable'), [
		'NAME1=VALUE1',
		'NAME2=VALUE2',
		'NAME3=VALUE3'
	]);
	t.equal(packet.toString(), 'action: varset\r\nvariable: NAME1=VALUE1\r\nvariable: NAME2=VALUE2\r\nvariable: NAME3=VALUE3\r\n\r\n');

	const object = packet.asObject;
	t.strictSame(object, {
		action: 'varset',
		variable: [
			'NAME1=VALUE1',
			'NAME2=VALUE2',
			'NAME3=VALUE3'
		]
	});
	t.equal(packet.asObject, object);
});

t.test('constructor with object', async t => {
	const packet = new Packet({
		action: 'Originate',
		variable: [
			'NAME1=VALUE1',
			'NAME2=VALUE2',
			'NAME3=VALUE3'
		]
	});

	t.equal(packet.toString(), 'action: Originate\r\nvariable: NAME1=VALUE1\r\nvariable: NAME2=VALUE2\r\nvariable: NAME3=VALUE3\r\n\r\n');
});

t.test('constructor with invalid input', async t => {
	t.throws(() => (new Packet(true)), TypeError);
});
