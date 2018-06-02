const sass = require('rollup-plugin-sass');
const resolve = require('rollup-plugin-node-resolve');
const commonjs = require('rollup-plugin-commonjs');
const nodeSass = require('node-sass');
const sassUtils = require('node-sass-utils')(nodeSass);

module.exports = (options) => {
	return {
		inputOptions: {
			input: 'src/main.js',
			plugins: [
				resolve(),
				commonjs(),
				sass({
					insert: true,
					options: {
						sourceMap: true,
						functions: {
							'options($keys)': function(keys) {
								let result = options,
									a;

								keys = keys.getValue().split(".");

								for (a = 0; a < keys.length; a++) {
									result = result[keys[a]];
								}

								if (!isNaN(result)) {
									result = sassUtils.castToSass(result + 'px');
								} else {
									result = sassUtils.castToSass(result);
								}

								return result;
							}
						}
					}
				})
			]
		},
		outputOptions: {
			format: 'iife'
		}
	};
};
