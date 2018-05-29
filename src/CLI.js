const fs = require('fs');
const util = require('util');
const path = require('path');
const chalk = require('chalk');
const boxen = require('boxen');
const commandLineArgs = require('command-line-args');
const commandLineUsage = require('command-line-usage');

const logo = require('./assets/logo');
const BaseApplication = require('./BaseApplication');
const Files = require('./Files');
const Template = require('./templates/Index');
const Thumbnails = require('./Thumbnails');
const Cache = require('./Cache');
const BaseFile = require('./BaseFile');

class CLI extends BaseApplication {
	init() {
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
			defaultValue: `${__dirname}${path.sep}templates${path.sep}basic`,
			description: 'Defines a path for the gallery template.'
		}];

		this.options = Object.assign(this.options, commandLineArgs(this.optionDefs, {
			camelCase: true
		}));

		// Set composite options
		this.options.thumbsDir = `${this.options.output}${path.sep}${this.options.thumbsDirName}`;
		this.options.fullDir = `${this.options.output}${path.sep}${this.options.fullDirName}`;
		this.options.cacheFile = `${this.options.output}${path.sep}${this.options.cacheFile}`;

		if (this.options.help) {
			this.printUsage();
			process.exit();
		}

		this.cache = new Cache(this.options);

		this.files = new Files(
			this.options,
			this.dataProgressCallback.bind(this),
			this.cache
		);

		this.template = new Template(
			this.options,
			this.dataProgressCallback.bind(this)
		);

		this.thumbnails = new Thumbnails(
			this.options,
			this.dataProgressCallback.bind(this),
			this.cache
		);

		this.prepareOutputDir();

		this.files.find(
			this.options.src
		)
			.then(this.thumbnails.generate)
			.then(this.template.build)
			.then(() => {
				this.cache.save();
			})
			.then(() => {
				this.write(chalk.green('Done!'));
				process.exit();
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

	dataProgressCallback(message, data) {
		if (data instanceof BaseFile) {
			this.write(`${message}: ${chalk.yellow(data.filename)}`);
		} else {
			this.stringProgressCallback(message, data);
		}
	}

	stringProgressCallback(message, data) {
		this.write(`${message}: ${chalk.yellow(data)}`);
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
