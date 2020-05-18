'use strict';

const isCI = require('is-ci');

module.exports = require('@cfware/nyc')
	.exclude(...(isCI ? ['lib/socket.js'] : []));
