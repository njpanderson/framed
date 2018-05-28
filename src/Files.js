const glob = require('glob');
const fs = require('fs');
const path = require('path');

const File = require('./File');
const Directory = require('./Directory');
const BaseApplication = require('./BaseApplication');

class Files extends BaseApplication {
	constructor(options, progressCallback, cache) {
		super(options);

		this.cache = cache;
		this.progressCallback = progressCallback;
	}

	find(root) {
		let result = [],
			tasks = [];

		this.prepareFullDir();

		return new Promise((resolve, reject) => {
			glob(`${root}/*`, {
				dot: false
			}, (error, files) => {
				error && reject(error);

				files.forEach(file => {
					let stat = fs.statSync(file);

					if (stat.isDirectory()) {
						tasks.push(this.find(file).then(subResult =>
							result.push(new Directory(file, subResult))
						));
					} else {
						if (this.options.copyFiles) {
							// Copy files to output directory
							tasks.push(
								this.copyFileToOutput(new File(file))
									.then(file => result.push(file))
							);
						} else {
							result.push(new File(file));
						}
					}
				});

				Promise.all(tasks)
					.then(() => {
						resolve(result)
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
				newFile;

			this.makeDir(path.dirname(dest));

			if (
				this.cache.cachedWithProp(file, 'full', true) &&
				fs.existsSync(dest)
			) {
				return resolve(new File(dest));
			}

			this.setProgress('Copying to output', file);

			fs.copyFile(file.filename, dest, (error) => {
				if (error) {
					return reject(error);
				}

				this.cache.add(file, 'full', true);

				resolve(new File(dest));
			});
		});
	}

	makeDir(dir) {
		let parts = dir.split(path.sep);

		parts.reduce((acc, val) => {
			acc += path.sep + val;

			if (!fs.existsSync(dir)) {
				fs.mkdirSync(dir);
			}

			return acc;
		});

		return true;
	}
}

module.exports = Files;
