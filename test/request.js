/* eslint "promise/prefer-await-to-then": 0 */
import {promisify} from 'util';

import t from 'libtap';

import {Request} from '../lib/request.js';
import {Packet} from '../lib/packet.js';

const delay = promisify(setTimeout);

const matchActionID = /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}\d+$/u;
const matchActionIDIgnore = /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}IGNORE$/u;

t.test('errors', async t => {
	t.throws(() => (new Request()), TypeError);
	t.throws(() => (new Request(true)), TypeError);
	t.throws(() => (new Request({})), TypeError);
});

t.test('basic', async t => {
	const fakeSocket = {
		txt: [],
		write(txt) {
			this.txt.push(txt);
		}
	};
	const object = {action: 'Test'};

	const autoID = new Request(object);
	const autoIDMatcher = new RegExp(`action: Test\r\nactionid: ${autoID.actionid}\r\n\r\n`, 'u');
	t.match(autoID.actionid, matchActionID);
	t.equal(autoID.ignoreResponse, false);
	t.match(autoID.toString(), autoIDMatcher);
	t.strictSame(autoID.responses, []);
	t.strictSame(autoID.response, undefined);
	t.strictSame(autoID.responsePackets, []);
	t.strictSame(autoID.responsePacket, undefined);
	autoID.sendTo(fakeSocket);
	t.strictSame(fakeSocket.txt, [autoID.toString()]);
	fakeSocket.txt = [];
	let resolved = false;
	autoID.promise.then(() => {
		resolved = true;
	});
	await delay(1);
	t.equal(resolved, false);

	const ignoreResponse = new Request(object, {ignoreResponse: true});
	const ignoreResponseMatcher = new RegExp(`action: Test\r\nactionid: ${ignoreResponse.actionid}\r\n\r\n`, 'u');
	t.match(ignoreResponse.actionid, matchActionIDIgnore);
	t.equal(ignoreResponse.ignoreResponse, true);
	t.match(ignoreResponse.toString(), ignoreResponseMatcher);
	t.strictSame(ignoreResponse.responses, []);
	t.strictSame(ignoreResponse.response, undefined);
	t.strictSame(ignoreResponse.responsePackets, []);
	t.strictSame(ignoreResponse.responsePacket, undefined);
	ignoreResponse.sendTo(fakeSocket);
	t.strictSame(fakeSocket.txt, [ignoreResponse.toString()]);
	fakeSocket.txt = [];
	resolved = false;
	ignoreResponse.promise.then(() => {
		resolved = true;
	});
	await delay(1);
	t.equal(resolved, true);
});

function setupPromiseState(request) {
	const state = {txt: 'pending'};
	request.promise
		.then(() => {
			state.txt = 'resolved';
		})
		.catch(error => {
			state.txt = 'rejected';
			state.error = error;
		});

	return state;
}

t.test('response success', async t => {
	const request = new Request({action: 'test'});
	const state = setupPromiseState(request);
	const response = new Packet({
		actionid: request.actionid,
		response: 'Success'
	});
	request.handleResponse(response);
	await delay(0);
	t.strictSame(state, {txt: 'resolved'});
	t.strictSame(request.response, response.asObject);
});

t.test('response no status', async t => {
	const request = new Request({action: 'test'});
	const state = setupPromiseState(request);
	request.handleResponse(new Packet({
		actionid: request.actionid,
		message: 'hey you guys'
	}));
	await delay(0);
	t.strictSame(state, {txt: 'resolved'});
});

t.test('response error', async t => {
	const request = new Request({action: 'test'});
	const state = setupPromiseState(request);
	request.handleResponse(new Packet({
		actionid: request.actionid,
		response: 'Error'
	}));
	await delay(0);
	t.match(state, {
		txt: 'rejected',
		error: Error
	});
	t.equal(state.error.request, request);
});

t.test('response list', async t => {
	const request = new Request({action: 'test'});
	const {actionid} = request;
	const state = setupPromiseState(request);

	request.handleResponse(new Packet({
		actionid,
		response: 'Success',
		eventlist: 'start'
	}));
	await delay(0);
	t.strictSame(state, {txt: 'pending'});

	request.handleResponse(new Packet({actionid, event: 'ListItem1'}));
	await delay(0);
	t.strictSame(state, {txt: 'pending'});

	request.handleResponse(new Packet({actionid, event: 'ListItem2'}));
	await delay(0);
	t.strictSame(state, {txt: 'pending'});

	request.handleResponse(new Packet({actionid, eventlist: 'Complete'}));
	await delay(1);
	t.strictSame(state, {txt: 'resolved'});
	t.equal(request.responsePackets.length, 4);
	t.strictSame(request.responsePackets.map(p => p.asObject), request.responses);
	t.equal(request.responses[0].eventlist, 'start');
	t.equal(request.responses[1].event, 'ListItem1');
	t.equal(request.responses[2].event, 'ListItem2');
	t.equal(request.responses[3].eventlist, 'Complete');
});

t.test('originate sync success', async t => {
	const request = new Request({action: 'Originate'});
	const {actionid} = request;
	const state = setupPromiseState(request);

	const finalResponse = new Packet({actionid, response: 'Success'});
	t.equal(request.handleResponse(finalResponse), true);
	await delay(0);
	t.strictSame(state, {txt: 'resolved'});

	t.equal(request.responsePacket, finalResponse);
});

t.test('originate async immediate error', async t => {
	const request = new Request({action: 'Originate'});
	const {actionid} = request;
	const state = setupPromiseState(request);

	const finalResponse = new Packet({actionid, response: 'Error', message: 'async immediate error'});
	t.equal(request.handleResponse(finalResponse), true);
	await delay(0);
	t.strictSame(state, {
		txt: 'rejected',
		error: Object.assign(new Error(`Originate: ${finalResponse.asObject.message}`), {request})
	});

	t.equal(request.responsePacket, finalResponse);
});

t.test('originate async error', async t => {
	const request = new Request({action: 'Originate', async: true});
	const {actionid} = request;
	const state = setupPromiseState(request);

	t.equal(request.handleResponse(new Packet({actionid, response: 'Success'})), false);
	await delay(0);
	t.strictSame(state, {txt: 'pending'});

	const finalResponse = new Packet({actionid, event: 'OriginateResponse', response: 'Failure'});
	t.equal(request.handleResponse(finalResponse), true);
	await delay(0);
	t.strictSame(state, {
		txt: 'rejected',
		error: Object.assign(new Error('Originate: unknown error'), {request})
	});

	t.equal(request.responsePacket, finalResponse);
});

t.test('originate async success', async t => {
	const request = new Request({action: 'Originate', async: true});
	const {actionid} = request;
	const state = setupPromiseState(request);

	t.equal(request.handleResponse(new Packet({actionid, response: 'Success'})), false);
	await delay(0);
	t.strictSame(state, {txt: 'pending'});

	const finalResponse = new Packet({actionid, event: 'OriginateResponse', response: 'Success'});
	t.equal(request.handleResponse(finalResponse), true);
	await delay(0);
	t.strictSame(state, {txt: 'resolved'});
	t.equal(request.responsePacket, finalResponse);
});
