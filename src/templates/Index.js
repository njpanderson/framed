const fs = require('fs');
const path = require('path');
const util = require('util');
const chalk = require('chalk');
const Handlebars = require('handlebars');

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
		this.template = null;

		this.validateAndIncludeTemplate();
	}

	build(files) {
		// Get count of directories (templates) (including current directory)
		this.taskCounts.count = this.getDirectoryCount(files) + 1;

		// Return the promise
		return new Promise((resolve, reject) => {
			let jsFilename = 'bundle.js',
				config, compiler, cwd;

			if (this.template.builder) {
				// Save and change working directory to the template
				cwd = process.cwd();
				process.chdir(this.template.root);

				this.template.builder(
					this.options,
					this.options.output + path.sep + jsFilename
				).then((manifest) => {
					// Reset working directory
					process.chdir(cwd);

					// Add result object to manifest
					this.manifest = Object.assign(this.manifest, manifest);
					this.compile(files).then(resolve);
				}, reject);
			} else {
				this.compile(files)
					.then(resolve)
					.catch(reject);
			}
		});
	}

	compile(files, parent, depth = 0) {
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
				// Add files to the dataset
				data.items.push(new Item(
					'file',
					file.href || this.makeRelative(file.filename),
					file.basename,
					this.getThumb(file),
					file.mimeType
				));
			} else if (file instanceof Directory) {
				// Add directories to the dataset
				data.items.push(new Item(
					'dir',
					file.templateFilename,
					file.basename,
					this.getRandomSubarray(this.getThumb(file), 10)
				));

				// Add compilation tasks for directories
				tasks = tasks.concat(this.compile(file.children, file, (depth + 1)));
			}
		});

		tasks.push(() => {
			return new Promise((resolve, reject) => {
				template = Handlebars.compile(fs.readFileSync(
					`${this.template.root}${path.sep}index.html`, {
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
			});
		});

		if (depth === 0) {
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

	validateAndIncludeTemplate() {
		const templateFiles = [
			'index.html'
		];

		let template;

		// Attempt to require the template
		this.template = require(this.options.template);

		if (this.template.builder && typeof this.template.builder !== 'function') {
			throw new Error(`Template builder defined but not a function.`);
		}

		for (template in this.template.templates) {
			if (!fs.existsSync(
				`${this.template.root}${path.sep}${this.template.templates[template]}`
			)) {
				throw new Error(`Template file "${template}" (${this.template.templates[template]}) not found within template path`);
			}
		}
	}
}

module.exports = Template;
