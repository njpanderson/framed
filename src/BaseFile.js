const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

class BaseFile {
	constructor(file) {
		const hash = crypto.createHash('sha256'),
			stat = fs.statSync(file);

		hash.update(file);

		this.filename = file;
		this.basename = path.basename(file);
		this.hash = hash.digest('hex');
		this.mtimeMs = stat.mtimeMs;
	}
}

module.exports = BaseFile;
