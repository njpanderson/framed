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

		this.getOptions();

		if (this.options.help) {
			this.writeUsage();
			process.exit();
		}

		this.cache = new Cache(this.options);
		this.progress = new Progress(this.options);

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

	getOptions() {
		this.options = {
			outputDirName: 'html',
			thumbsDirName: '_thumbs',
			fullDirName: '_full',
			cacheFile: '.cache',
			indexFilename: 'index.html'
		};

		this.optionDefs = [{
			name: 'src',
			type: String,
			defaultOption: true,
			defaultValue: process.cwd(),
			typeLabel: '{underline path}',
			description: 'The source directory to scan for content.'
		}, {
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
			name: 'copy-files',
			type: Boolean,
			defaultValue: false,
			alias: 'c',
			description: 'Copies files to the output directory.'
		}, {
			name: 'run-js',
			type: String,
			defaultValue: '',
			description: 'Run a JS script on each file during collection. (Implies -c).'
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
			description: 'Produces more output data (and disables progress bars).'
		}, {
			name: 'silent',
			type: Boolean,
			alias: 's',
			defaultValue: false,
			description: 'Supresses all output except for errors. (Disables -v).'
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

		// Set implied options
		if (this.options.runJs) {
			this.options.copyFiles = true;
		}

		if (this.options.silent) {
			this.options.verbose = false;
		}
	}

	init() {
		this.writeIntro();
		this.prepareOutputDir();

		// Step 1 - Find files
		this.startProgress(chalk.blue('Finding files...'));

		this.files.find(
			this.options.src
		)
			.then((files) => {
				this.doneProgress(`${chalk.green(this.getFileCount(files))} file(s) found.\n`);

				// Step 2 - Generate thumbnails
				this.startProgress(chalk.blue('Generating thumbnails...'));
				return this.thumbnails.generate(files);
			})
			.then((files) => {
				this.doneProgress(
					`${chalk.green(this.thumbnails.taskCounts.complete)} thumbnail(s) generated ` +
					`(${chalk.green(this.thumbnails.taskCounts.cached)} thumbnail(s) cached).\n`
				);

				// Step 3 - Build templates
				this.startProgress(chalk.blue('Building templates...'));
				return this.template.build(files);
			})
			.then(() => {
				this.doneProgress(
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

	startProgress(message) {
		message && this.write(message);

		if (!this.options.silent && !this.options.verbose) {
			this.progress.start();
		}
	}

	doneProgress(message) {
		if (!this.options.silent && !this.options.verbose) {
			this.progress.done();
		}

		message && this.write(message);
	}

	setProgressCallback(item, percentage) {
		// console.log('pc', item, percentage);
		if (!this.options.silent) {
			this.progress.set(item, percentage || null);
		}
	}

	writeIntro() {
		this.write(chalk.yellow(logo));
		this.write('');

		this.write(chalk.blue('Your settings:'));
		this.write(` Source: ${chalk.yellow(this.options.src)}`);
		this.write(` Output: ${chalk.yellow(this.options.output)}`);

		if (this.options.copyFiles) {
			if (this.options.runJs) {
				this.write(` ${chalk.yellow(this.options.runJs)} will be run on each file.`);
			} else {
				this.write(` Each file will be copied to the output folder.`);
			}
		}

		this.write('');
	}

	writeUsage() {
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
