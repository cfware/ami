'use strict';

const isCI = require('is-ci');

module.exports = require('@cfware/nyc')
	.all()
	.exclude(...(isCI ? ['lib/socket.js'] : []))
	.fullCoverage();
