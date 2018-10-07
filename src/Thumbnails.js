const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const ffmpeg = require('fluent-ffmpeg');

const BaseApplication = require('./BaseApplication');
const File = require('./File');
const Directory = require('./Directory');

class Thumbnails extends BaseApplication {
	constructor(options, progressCallback, cache) {
		super(options, progressCallback);

		this.cache = cache;

		this.generate = this.generate.bind(this);
	}

	generate(files) {
		this.taskCounts.count = this.getFileCount(files);
		this.taskCounts.cached = 0;

		this.prepareThumbDir();

		return this.runTasksInSerial(this.populateTasks(files))
			.then(() => files);
	}

	populateTasks(files) {
		let tasks = [],
			counts, outputFile;

		files.forEach((file) => {
			// Generate a hashed thumbnail file and add its filename to the BaseFile object.
			let outputFile;

			if (file instanceof File) {
				switch (file.mimeType) {
					case 'image/jpeg':
					case 'image/png':
					case 'image/gif':
						outputFile = this.getOutputFile(
							file,
							this.options.thumbsDir + path.sep +
								file.hash + file.extension
						);

						if (!outputFile.cached) {
							tasks.push(() => {
								return this.generateImageThumbnail(
									file,
									outputFile.filename
								).then((thumbnailFilename) => {
									file.thumbnailFilename = thumbnailFilename;
									this.cache.add(file, 'thumb', true);
									this.incrementProgress(file.filename);

									return file;
								})
								.catch((error) => {
									this.logError(error, file);
									this.incrementProgress(file.filename);
								});
							});
						} else {
							this.incrementProgress(file.filename);
							this.taskCounts.cached += 1;
							file.thumbnailFilename = outputFile.filename;
						}

						break;

					case 'video/mp4':
					case 'video/quicktime':
					case 'video/ogg':
					case 'video/webm':
						outputFile = this.getOutputFile(
							file,
							this.options.thumbsDir + path.sep +
								file.hash + '.jpg'
						);

						if (!outputFile.cached) {
							tasks.push(() => {
								return this.generateVideoThumbnail(
									file,
									outputFile.filename
								).then((thumbnailFilename) => {
									file.thumbnailFilename = thumbnailFilename;
									this.cache.add(file, 'thumb', true);
									this.incrementProgress(file.filename);

									return file;
								})
								.catch((error) => {
									this.logError(error, file);
									this.incrementProgress(file.filename);
								})
							});
						} else {
							this.incrementProgress(file.filename);
							this.taskCounts.cached += 1;
							file.thumbnailFilename = outputFile.filename;
						}

						break;

					default:
						file.valid = false;
						// this.writeError(
						// 	`Format ${file.mimeType} not supported. ` +
						// 	`Thumb for ${file.filename} not generated.`
						// );
				}
			} else if (file instanceof Directory) {
				tasks = tasks.concat(
					this.populateTasks(file.children)
				);
			}
		});

		return tasks;
	}

	getOutputFile(file, outputFile) {
		return {
			cached: (
				this.cache.cachedWithProp(file, 'thumb', true) &&
				fs.existsSync(outputFile)
			),
			filename: outputFile
		};
	}

	prepareThumbDir() {
		// Attempt to create thumbs directory
		try {
			if (!fs.existsSync(this.options.thumbsDir)) {
				fs.mkdirSync(this.options.thumbsDir);
			}
		} catch (e) {
			this.writeError(`Could not create output directory: ${e.message}`);
		}
	}

	generateImageThumbnail(file, outputFile) {
		return new Promise((resolve, reject) => {
			if (!(file instanceof File)) {
				reject('file is not an instance of File');
			}

			sharp(file.filename)
				.resize(this.options.width, this.options.height)
				.max()
				.toFile(outputFile)
				.then(() => resolve(outputFile))
				.catch(reject);
		});
	}

	generateVideoThumbnail(file, outputFile) {
		return new Promise((resolve, reject) => {

			ffmpeg(file.filename)
				.on('end', function() {
					resolve(outputFile);
				})
				.on('error', function(err, stdout, stderr) {
					reject('Cannot process video: ' + err.message);
				})
				.screenshots({
					timestamps: ['50%'],
					filename: file.hash + '.jpg',
					folder: this.options.thumbsDir,
					size: this.options.width + 'x?'
				});
		});
	}
}

module.exports = Thumbnails;
