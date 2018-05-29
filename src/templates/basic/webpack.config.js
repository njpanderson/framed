const path = require('path');
const sass = require("node-sass");
const sassUtils = require("node-sass-utils")(sass);

module.exports = (options) => {
	return {
		entry: 'src/main.js',
		module: {
			rules: [{
				test: /\.scss$/,
				use: [{
					loader: 'style-loader',
				}, {
					loader: 'css-loader',
					options: {
						sourceMap: true
					}
				}, {
					loader: 'sass-loader',
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
				}]
			}]
		},
		devtool: 'eval-source-map'
	};
};
