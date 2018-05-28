const crypto = require('crypto');

const BaseFile = require('./BaseFile');

class Directory extends BaseFile {
	constructor(file, children) {
		const hash = crypto.createHash('sha256');

		hash.update(file);

		super(file);
		this.children = children;
		this.templateFilename = hash.digest('hex') + '.html';
	}
}

module.exports = Directory;
