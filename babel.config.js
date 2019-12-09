'use strict';

module.exports = {
	// Work around https://github.com/vadimdemedes/import-jsx/pull/8
	overrides: [{
		test: ['esm/*.js'],
		plugins: [
			'@babel/plugin-transform-modules-commonjs',
			'@babel/plugin-proposal-class-properties',
			'@babel/plugin-proposal-optional-catch-binding'
		]
	}]
};
