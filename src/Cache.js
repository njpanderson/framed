const fs = require('fs');
const path = require('path');

class Cache {
	constructor(options) {
		this.options = options;
		this.cache = this.getCache();
	}

	getCache() {
		let cache;

		if (fs.existsSync(this.options.cacheFile)) {
			cache = fs.readFileSync(this.options.cacheFile, {
				encoding: 'UTF-8'
			});

			return JSON.parse(cache);
		}

		return {
			lastRun: Date.now(),
			files: {}
		};
	}

	save() {
		this.cache.lastRun = Date.now();

		fs.writeFileSync(
			this.options.cacheFile,
			JSON.stringify(this.cache)
		);
	}

	add(file, prop, value) {
		this.cache.files[file.hash] = {
			mtimeMs: file.mtimeMs
		};

		if (prop) {
			this.cache.files[file.hash][prop] = {
				mtimeMs: file.mtimeMs,
				value
			};
		}
	}

	/**
	 * Tests if a cache entry for the BaseFile file exists.
	 * @param {object} file
	 * @param {boolean} newOnly
	 */
	cached(file, newOnly = true) {
		if (
			this.cache.files[file.hash] &&
			(
				(newOnly && this.cache.files[file.hash].mtimeMs < Date.now()) ||
				!newOnly
			)
		) {
			return true;
		}

		return false;
	}

	/**
	 * Tests if a cache entry for the BaseFile file exists with a specific property.
	 * @param {object} file
	 * @param {string} prop
	 * @param {*} value
	 * @param {boolean} newOnly
	 */
	cachedWithProp(file, prop, value, newOnly = true) {
		if (
			this.cached(file, newOnly) &&
			this.cache.files[file.hash][prop] &&
			this.cache.files[file.hash][prop].value === value &&
			(
				(newOnly && this.cache.files[file.hash][prop].mtimeMs < Date.now()) ||
				!newOnly
			)
		) {
			return true;
		}

		return false;
	}
}

module.exports = Cache;
