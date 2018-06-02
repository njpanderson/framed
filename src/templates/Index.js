const fs = require('fs');
const path = require('path');
const util = require('util');
const chalk = require('chalk');
const Handlebars = require('handlebars');
const rollup = require('rollup');

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
		// Get count of directories (templates) (including current directory)
		this.taskCounts.count = this.getDirectoryCount(files) + 1;

		// Return the promise
		return new Promise((resolve, reject) => {
			let rollupConfigFile = this.options.template + path.sep + 'rollup.config.js',
				jsFilename = 'bundle.js',
				config, compiler;

			if (fs.existsSync(rollupConfigFile)) {
				config = require(rollupConfigFile)(this.options);

				// Override config
				if (typeof config.inputOptions.input === 'string') {
					config.inputOptions.input = path.resolve(
						this.options.template + path.sep + config.inputOptions.input
					);
				}

				config.outputOptions = Object.assign(config.outputOptions, {
					file: this.options.output + path.sep + jsFilename
				});

				this.manifest.script = jsFilename;

				rollup.rollup(config.inputOptions)
					.then((bundle) => bundle.write(config.outputOptions))
					.then(() => this.compile(files))
					.then(resolve)
					.catch(reject);
			} else {
				this.compile(files)
					.then(resolve)
					.catch(reject);
			}
		});
	}

	compile(files, parent) {
		let data = {
				"items": []
			},
			tasks = [],
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
				data.items.push(new Item(
					'dir',
					file.templateFilename,
					file.basename,
					this.getRandomSubarray(this.getThumb(file), 10)
				));

				// Go compile sub directories
				tasks.concat(this.compile(file.children, file));
			}
		});

		tasks.push(new Promise((resolve, reject) => {
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

			resolve();
		}));

		if (!parent) {
			return this.runTasksInSerial(tasks);
		} else {
			return tasks;
		}
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
		this.incrementProgress(filename);

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
