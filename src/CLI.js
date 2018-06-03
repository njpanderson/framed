const fs = require('fs');
const util = require('util');
const path = require('path');
const chalk = require('chalk');
const commandLineArgs = require('command-line-args');
const commandLineUsage = require('command-line-usage');

const logo = require('./assets/logo');
const BaseApplication = require('./BaseApplication');
const Files = require('./Files');
const Template = require('./templates/Index');
const Thumbnails = require('./Thumbnails');
const Cache = require('./Cache');
const Progress = require('./Progress');

class CLI extends BaseApplication {
	constructor() {
		super();

		this.options = {
			outputDirName: 'html',
			thumbsDirName: '_thumbs',
			fullDirName: '_full',
			cacheFile: '.cache',
			indexFilename: 'index.html'
		};

		this.optionDefs = [{
			name: 'help',
			type: Boolean,
			description: 'Displays this help.'
		}, {
			name: 'output',
			alias: 'o',
			type: String,
			defaultValue: `${process.cwd()}${path.sep}${this.options.outputDirName}`,
			typeLabel: '{underline path}',
			description: 'An output directory to store the gallery HTML.'
		}, {
			name: 'src',
			type: String,
			defaultOption: true,
			defaultValue: process.cwd(),
			typeLabel: '{underline path}',
			description: 'The source directory to scan for content.'
		}, {
			name: 'copy-files',
			type: Boolean,
			defaultValue: false,
			alias: 'c',
			description: 'Copies files to the output directory.'
		}, {
			name: 'run-js',
			type: String,
			defaultValue: '',
			description: 'Run a JS script on each file during collection.'
		}, {
			name: 'width',
			type: Number,
			alias: 'w',
			defaultValue: 300,
			description: 'Thumbnail width, in pixels.'
		}, {
			name: 'height',
			type: Number,
			alias: 'h',
			defaultValue: 300,
			description: 'Thumbnail height, in pixels.'
		}, {
			name: 'template',
			type: String,
			alias: 't',
			defaultValue: `njp-framed-basic`,
			description: 'Defines a node module ID for the gallery template.'
		}, {
			name: 'verbose',
			type: Boolean,
			alias: 'v',
			defaultValue: false,
			description: 'Produces more output data.'
		}];

		this.options = Object.assign(this.options, commandLineArgs(this.optionDefs, {
			camelCase: true
		}));

		// Sanity check options
		this.options.output = this.options.output.replace(/\/$/, '');
		this.options.src = this.options.src.replace(/\/$/, '');

		// Set composite options
		this.options.thumbsDir = `${this.options.output}${path.sep}${this.options.thumbsDirName}`;
		this.options.fullDir = `${this.options.output}${path.sep}${this.options.fullDirName}`;
		this.options.cacheFile = `${this.options.output}${path.sep}${this.options.cacheFile}`;

		if (this.options.help) {
			this.printUsage();
			process.exit();
		}

		this.cache = new Cache(this.options);
		this.progress = new Progress();

		this.files = new Files(
			this.options,
			this.setProgressCallback.bind(this),
			this.cache
		);

		this.template = new Template(
			this.options,
			this.setProgressCallback.bind(this)
		);

		this.thumbnails = new Thumbnails(
			this.options,
			this.setProgressCallback.bind(this),
			this.cache
		);
	}

	init() {
		this.write(chalk.yellow(logo));
		this.write('');

		this.prepareOutputDir();

		this.write(chalk.blue('Finding files...'));
		this.progress.start();

		this.files.find(
			this.options.src
		)
			.then((files) => {
				this.progress.done();

				this.write(`${chalk.green(this.getFileCount(files))} file(s) found.\n`);
				this.write(chalk.blue('Generating thumbnails...'));

				this.progress.start();
				return this.thumbnails.generate(files);
			})
			.then((files) => {
				this.progress.done();

				this.write(
					`${chalk.green(this.thumbnails.taskCounts.complete)} thumbnail(s) generated ` +
					`(${chalk.green(this.thumbnails.taskCounts.cached)} thumbnail(s) cached).\n`
				);

				this.write(chalk.blue('Building templates...'));
				this.progress.start();
				return this.template.build(files);
			})
			.then(() => {
				this.progress.done();

				this.write(
					`${chalk.green(this.template.taskCounts.complete)} template(s) generated.\n`
				);

				return this.cache.save();
			})
			.then(() => {
				this.write(chalk.green('Done!'));
				process.exit();
			})
			.catch((error) => {
				this.progress.clear();
				this.writeError(error);
			});
	}

	prepareOutputDir() {
		if (!this.options || !this.options.output) {
			this.writeError('Output directory not defined');
		}

		// Attempt to create output directory
		try {
			if (!fs.existsSync(this.options.output)) {
				fs.mkdirSync(this.options.output);
			}
		} catch (e) {
			this.writeError(`Could not create output directory: ${e.message}`);
		}
	}

	setProgressCallback(item, percentage) {
		// console.log('pc', item, percentage);
		if (!this.options.silent) {
			this.progress.set(item, percentage || null);
		}
	}

	printUsage() {
		const sections = [{
			content: chalk.yellow(logo),
			raw: true
		}, {
			header: 'Image & video gallery generator',
			content: 'Generates static HTML galleries of {italic video} and {italic image} collections.'
		}, {
			header: 'Options',
			optionList: this.optionDefs
		}, {
			header: 'Example use',
			content: [{
				desc: 'Generate thumbnails at current location',
				example: 'generate-thumbnails /Your/path/to/images'
			}, {
				desc: 'Copy source images before generating',
				example: 'generate-thumbnails -c /Your/path/to/images'
			}]
		}];

		const usage = commandLineUsage(sections)
		this.write(usage);
	}
}

module.exports = CLI;
