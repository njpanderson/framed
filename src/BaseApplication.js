const os = require('os');
const chalk = require('chalk');
const path = require('path');

const Directory = require('./Directory');

class BaseApplication {
	constructor(options, progressCallback = null) {
		this.options = options;
		this.progressCallback = progressCallback;
		this.errorsLogged = [];

		this.taskCounts = {
			count: 0,
			complete: 0
		};
	}

	logError(error, file) {
		let errorMessage;

		errorMessage = (error instanceof Error) ? Error.message : error;

		this.errorsLogged.push({
			originalError: error,
			file: file,
			message: errorMessage +
				(file ? ` (${file.filename})` : '')
		});
	}

	writeError(error) {
		if (error instanceof Error) {
			this.write(chalk.red(`Error: ${error.message}`));

			error.code &&this.write(`${chalk.red('Code:')}: ${error.code}`);
			error.frame &&this.write(`${chalk.red('Frame:')}: ${error.frame}`);
			error.stack &&this.write(`${chalk.red('Stack trace:')}:\n${error.stack}`);
			process.exitCode = error.code;
		} else {
			this.write(chalk.red('Error:') + ' ' + error);
			process.exitCode = 1;
		}
	}

	/**
	 * Write a single message to the console.
	 * @param {string} message - Message to write.
	 * @param {boolean} [newline = true] - Whether to enter a newline character at the end.
	 */
	write(message, newline = true) {
		if (!this.options.silent) {
			process.stdout.write(message + (newline ? os.EOL : '\0'));
		}
	}

	incrementProgress(item) {
		let percentage = (100/this.taskCounts.count) * ++this.taskCounts.complete;

		if (this.options.verbose) {
			this.write(`${item}`);
		}

		this.setProgress(item, percentage);
	}

	setProgress(item, percentage) {
		if (typeof this.progressCallback === 'function') {
			this.progressCallback(item, percentage);
		}
	}

	/**
	 * Takes an array and returns a sample with random elements chosen.
	 * @param {array} arr - Array to sample
	 * @param {number} size - Size of resulting array
	 * @see https://stackoverflow.com/questions/11935175/sampling-a-random-subset-from-an-array
	 */
	getRandomSubarray(arr, size) {
		let shuffled = arr.slice(0),
			a = arr.length,
			temp, index;

		while (a--) {
			index = Math.floor((a + 1) * Math.random());
			temp = shuffled[index];
			shuffled[index] = shuffled[a];
			shuffled[a] = temp;
		}
		return shuffled.slice(0, size);
	}

	makeRelative(filename) {
		return filename.replace(this.options.output + path.sep, '');
	}

	runTasksInSerial(tasks) {
		// console.log(`About to run ${tasks.length} task(s)...`);
		return new Promise((resolve, reject) => {
			let results = [];

			const runner = function() {
				if (tasks.length) {
					// console.log(`${tasks.length} remaining...`);
					(tasks.shift()).call(this)
						.then((result) => {
							results.push(result);
							runner();
							// setTimeout(runner, 500);
						})
						.catch(reject)
				} else {
					// console.log(`No tasks left! Resolving...`);
					resolve(results);
				}
			};

			runner();
		});
	}

	/**
	 * Counts all the files within an array.
	 * @param {Array} files - Files to count.
	 */
	getFileCount(files) {
		return files.reduce((count, file) => {
			count += 1;

			if (file instanceof Directory) {
				count += this.getFileCount(file.children);
			}

			return count;
		}, 0);
	}

	/**
	 * Counts all the directories within an array.
	 * @param {Array} files - Files containing directories to count.
	 */
	getDirectoryCount(files) {
		return files.reduce((count, file) => {
			if (file instanceof Directory) {
				count += 1;
				count += this.getDirectoryCount(file.children);
			}

			return count;
		}, 0);
	}
}

module.exports = BaseApplication;
