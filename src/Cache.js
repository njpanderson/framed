const util = require('util');
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
		if (!this.cache.files[file.hash]) {
			this.cache.files[file.hash] = {};
		}

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
	 */
	cached(file, newOnly = true) {
		return this.cache.files[file.hash] || false;
	}

	/**
	 * Tests if a cache entry for the BaseFile file exists with a specific property.
	 * @param {object} file
	 * @param {string} prop
	 * @param {*} value
	 * @param {boolean} newOnly
	 */
	cachedWithProp(file, prop, value, newOnly = true) {
		let cache;

		if (
			(cache = this.cached(file)) &&
			cache[prop] &&
			cache[prop].value === value &&
			(
				(newOnly && cache[prop].mtimeMs <= file.mtimeMs) ||
				!newOnly
			)
		) {
			return true;
		}

		return false;
	}
}

module.exports = Cache;
