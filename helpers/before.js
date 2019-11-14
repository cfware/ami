#!/usr/bin/env node
const AsteriskInstance = require('./asterisk-instance.js');

async function main() {
	const asterisk = new AsteriskInstance();
	await asterisk.build();
	await asterisk.start();
}

main().catch(error => {
	console.error(error);
	process.exit(1);
});
