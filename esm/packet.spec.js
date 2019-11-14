import {test} from 'tap';

import {Packet} from './packet.js';

test('constructor without text', async t => {
	const packet = new Packet();
	t.type(packet, Packet);
	t.is(packet.toString(), '');
	t.strictSame(packet.values, []);
	t.strictSame(packet.value('action'), []);
});

test('constructor with text', async t => {
	const packet = new Packet('Action: Originate\r\nChannel: Local/1234@default');
	t.is(packet.toString(), 'action: Originate\r\nchannel: Local/1234@default\r\n\r\n');
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

	t.is(packet.toString(), 'action: Originate\r\nchannel: Local/1234@default\r\nadded: value\r\n\r\n');
	packet.assign({another: 'value'});
	t.is(packet.toString(), 'action: Originate\r\nchannel: Local/1234@default\r\nadded: value\r\nanother: value\r\n\r\n');

	packet.assign({action: 'varset'}, true);
	t.is(packet.toString(), 'action: varset\r\n\r\n');

	packet.append('variable', 'NAME1=VALUE1');
	t.is(packet.flatValue('variable'), 'NAME1=VALUE1');
	packet.append('variable', 'NAME2=VALUE2');
	packet.append('variable', 'NAME3=VALUE3');
	t.strictSame(packet.flatValue('variable'), [
		'NAME1=VALUE1',
		'NAME2=VALUE2',
		'NAME3=VALUE3'
	]);
	t.is(packet.toString(), 'action: varset\r\nvariable: NAME1=VALUE1\r\nvariable: NAME2=VALUE2\r\nvariable: NAME3=VALUE3\r\n\r\n');

	const obj = packet.asObject;
	t.strictSame(obj, {
		action: 'varset',
		variable: [
			'NAME1=VALUE1',
			'NAME2=VALUE2',
			'NAME3=VALUE3'
		]
	});
	t.is(packet.asObject, obj);
});

test('constructor with object', async t => {
	const packet = new Packet({
		action: 'Originate',
		variable: [
			'NAME1=VALUE1',
			'NAME2=VALUE2',
			'NAME3=VALUE3'
		]
	});

	t.is(packet.toString(), 'action: Originate\r\nvariable: NAME1=VALUE1\r\nvariable: NAME2=VALUE2\r\nvariable: NAME3=VALUE3\r\n\r\n');
});

test('constructor with invalid input', async t => {
	t.throws(() => (new Packet(true)), TypeError);
});
