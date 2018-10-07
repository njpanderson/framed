const Glob = require('glob').Glob;
const fs = require('fs');
const path = require('path');

const File = require('./File');
const Directory = require('./Directory');
const BaseApplication = require('./BaseApplication');

class Files extends BaseApplication {
	constructor(options, progressCallback, cache) {
		super(options);

		this.globOptions = {
			dot: false
		};

		this.cache = cache;
		this.progressCallback = progressCallback;
	}

	find(root) {
		// Attach jsRunner
		if (this.options.runJs && !this.jsRunner) {
			// Get JS script from include
			this.jsRunner = require(path.resolve(this.options.runJs));
		}

		// Find a list all files and get a count
		return new Promise((resolve, reject) => {
			let glob = new Glob(`${root}/**/*`, Object.assign({}, this.globOptions, {
				nodir: true
			}), (error, files) => {
				if (error) {
					return reject(error);
				}

				this.taskCounts.count = files.length;

				// Then, run the parser
				this.parse(root, glob.cache).then((results) => {
					// console.log('find resolve');
					return results;
				}).then(resolve, reject);
			});
		});
	}

	parse(root, globCache) {
		let result = [],
			tasks = [];

		this.prepareFullDir();

		return new Promise((resolve, reject) => {
			let glob = new Glob(`${root}/*`, Object.assign({}, this.globOptions, {
					cache: globCache
				}), (error, files) => {
				if (error) {
					return reject(error);
				}

				files.forEach(file => {
					let stat = fs.statSync(file);

					if (stat.isDirectory()) {
						tasks.push(() => this.parse(file, globCache).then(subResult =>
							result.push(new Directory(file, subResult))
						));
					} else {
						if (this.options.copyFiles) {
							// Copy files to output directory
							tasks.push(() => {
								return this.copyFileToOutput(new File(file))
									.then(file => {
										this.incrementProgress(file.filename);
										result.push(file);
									})
									.catch(this.writeError.bind(this))
							});
						} else {
							this.incrementProgress(file);
							result.push(new File(file));
						}
					}
				});

				this.runTasksInSerial(tasks)
					.then(() => {
						// console.log('task resolve');
						resolve(result)
					})
					.catch((error) => {
						this.writeError(error);
					});
			});
		});
	}

	prepareFullDir() {
		// Attempt to create thumbs directory
		if (!this.options.copyFiles) {
			return;
		}

		try {
			if (!fs.existsSync(this.options.fullDir)) {
				fs.mkdirSync(this.options.fullDir);
			}
		} catch (e) {
			this.writeError(`Could not create output directory: ${e.message}`);
		}
	}

	copyFileToOutput(file) {
		return new Promise((resolve, reject) => {
			let dest = this.options.fullDir + file.filename.replace(this.options.src, ''),
				newFile, done, destExists;

			this.makeDir(path.dirname(dest));

			try {
				destExists = fs.lstatSync(dest);
			} catch(e) {
				destExists = false;
			}

			done = (error) => {
				if (error) {
					return reject(error);
				}

				this.cache.add(file, 'full', true);

				resolve(new File(file.filename, this.makeRelative(dest)));
			};

			// Either copy or run JS on the file
			if (this.jsRunner) {
				this.runJs('read', file.filename, dest)
					.then((result) => {
						if (this.cache.cachedWithProp(file, 'full', true) && result === true) {
							return done();
						}

						return this.runJs('write', file.filename, dest)
							.then(done)
							.catch(this.writeError.bind(this));
					});
			} else {
				if (this.cache.cachedWithProp(file, 'full', true) && destExists) {
					return done();
				}

				if (destExists) {
					fs.unlinkSync(dest);
				}

				fs.copyFile(file.filename, dest, done);
			}
		});
	}

	runJs(method, src, dest) {
		return new Promise((resolve, reject) => {
			let result;

			if (typeof this.jsRunner[method] === 'function') {
				result = this.jsRunner[method].apply(this, [...arguments].slice(1));

				if (result instanceof Promise) {
					result.then(resolve).catch(reject);
				} else {
					reject(result);
				}
			} else {
				reject(`JS Runner must return an Object with the method "${method}".`);
			}
		});
	}

	makeDir(dir) {
		let parts = dir.split(path.sep);

		parts.reduce((acc, val) => {
			acc += path.sep + val;

			if (!fs.existsSync(acc)) {
				fs.mkdirSync(acc);
			}

			return acc;
		});

		return true;
	}
}

module.exports = Files;
