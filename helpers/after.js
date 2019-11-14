#!/usr/bin/env node
const AsteriskInstance = require('./asterisk-instance.js');

async function main() {
	const asterisk = new AsteriskInstance();
	await asterisk.init();
	await asterisk.stop();
}

main().catch(error => {
	console.error(error);
	process.exit(1);
});
