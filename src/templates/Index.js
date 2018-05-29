const fs = require('fs');
const path = require('path');
const util = require('util');
const chalk = require('chalk');
const Handlebars = require('handlebars');
const webpack = require('webpack');

const File = require('../File');
const Directory = require('../Directory');
const Item = require('./Item');
const BaseApplication = require('../BaseApplication');

class Template extends BaseApplication {
	constructor(options, progressCallback) {
		super(options, progressCallback);
		this.compile = this.compile.bind(this);
		this.build = this.build.bind(this);
		this.manifest = {};

		this.validateTemplate();
	}

	build(files) {
		this.write(chalk.blue('Building templates...'));

		return new Promise((resolve, reject) => {
			let webpackConfigFilename = this.options.template + path.sep + 'webpack.config.js',
				jsFilename = 'bundle.js',
				config;

			if (fs.existsSync(webpackConfigFilename)) {
				config = require(webpackConfigFilename)(this.options);

				// Override output
				if (typeof config.entry === 'string') {
					config.entry = path.resolve(this.options.template + path.sep + config.entry);
				}

				config = Object.assign(config, {
					output: {
						filename: jsFilename,
						path: this.options.output
					},
					resolve: {
						modules: [
							path.resolve(__dirname, "../../node_modules"),
							'node_modules'
						]
					}
				});

				this.manifest.script = jsFilename;

				webpack(config, (error, stats) => {
					if (error || stats.hasErrors()) {
						if (stats.hasErrors()) {
							this.write(stats.toJson('minimal'));
						}
						reject('Error compiling webpack config');
					}

					// Done processing
					this.compile(files)
					resolve();
				});
			} else {
				this.compile(files)
				resolve();
			}
		});
	}

	compile(files, parent) {
		let data = {
				"items": []
			},
			template;

		if (!parent) {
			parent = {
				templateFilename: this.options.indexFilename,
				basename: 'Home'
			};
		};

		files.forEach((file) => {
			if (file instanceof File) {
				// Add files to a template list
				data.items.push(new Item(
					'file',
					file.href || this.makeRelative(file.filename),
					file.basename,
					this.getThumb(file),
					file.mimeType
				));
			} else if (file instanceof Directory) {
				// Go compile sub directories
				this.compile(file.children, file);

				data.items.push(new Item(
					'dir',
					file.templateFilename,
					file.basename,
					this.getRandomSubarray(this.getThumb(file), 10)
				));
			}
		});

		template = Handlebars.compile(fs.readFileSync(
			`${this.options.template}${path.sep}index.html`, {
				encoding: 'UTF-8'
			}
		));

		data.title = parent.basename;
		data.script = this.manifest.script;

		this.save(
			template(this.sortData(data)),
			parent.templateFilename
		);
	}

	getThumb(file) {
		if (file instanceof File) {
			// Add files to a template list
			return [{
				src: this.makeRelative(file.thumbnailFilename)
			}];
		} else if (file instanceof Directory) {
			return this.getDirThumbs(file);
		}
	}

	getDirThumbs(file) {
		let thumbs = [];

		if (file instanceof Directory) {
			file.children.forEach((file) => {
				if (file instanceof File) {
					thumbs.push({
						src: this.makeRelative(file.thumbnailFilename)
					});
				}
			})
		}

		return thumbs;
	}

	sortData(data) {
		data.items.sort((a, b) => {
			if (a.type === 'dir' || a.label < b.label) return -1;
			if (a.label > b.label) return 1;
		});

		return data;
	}

	save(content, filename) {
		this.setProgress('Generating template', filename);

		fs.writeFileSync(this.options.output + path.sep + filename, content, {
			encoding: 'UTF-8'
		});
	}

	mkDir(filename) {
		path.dirname(filename).split(path.sep).reduce((dir, part) => {
			if (part !== "") {
				dir = dir + path.sep + part;

				if (!fs.existsSync(dir)) {
					// Create directory
					fs.mkdirSync(dir);
				}

				return dir;
			}
		});
	}

	validateTemplate() {
		const templateFiles = [
			'index.html'
		];

		if (!fs.existsSync(`${this.options.template}`)) {
			throw new Error(`Template path "${this.options.template}" not found`);
		}

		templateFiles.forEach((file) => {
			if (!fs.existsSync(`${this.options.template}${path.sep}${file}`)) {
				throw new Error(`Template file "${file}" not found within template path`);
			}
		});
	}
}

module.exports = Template;
