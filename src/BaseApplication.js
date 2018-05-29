const os = require('os');
const chalk = require('chalk');
const path = require('path');

class BaseApplication {
	constructor(options, progressCallback = null) {
		this.options = options;
		this.progressCallback = progressCallback;
	}

	writeError(error) {
		if (error instanceof Error) {
			this.write(chalk.red('Error:') + ' ' + error.message);
		} else {
			this.write(chalk.red('Error:') + ' ' + error);
		}
	}

	/**
	 * Write a single message to the console.
	 * @param {string} message - Message to write.
	 * @param {boolean} [newline = true] - Whether to enter a newline character at the end.
	 */
	write(message, newline = true) {
		process.stdout.write(message + (newline ? os.EOL : '\0'));
	}

	setProgress(message, data) {
		if (typeof this.progressCallback === 'function') {
			this.progressCallback(message, data);
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
		return new Promise((resolve, reject) => {
			let results = [];

			const runner = function() {
				if (tasks.length) {
					(tasks.shift()).call(this)
						.then((result) => {
							results.push(result);
							runner();
						})
						.catch(reject)
				} else {
					resolve(results);
				}
			};

			runner();
		});
	}
}

module.exports = BaseApplication;
