const crypto = require('crypto');
const path = require('path');
const mime = require('mime-types');

const BaseFile = require('./BaseFile');

class File extends BaseFile {
	constructor(file, href) {
		super(file);

		this.href = href || null;
		this.extension = path.extname(file);
		this.mimeType = mime.lookup(file);
		this.thumbnailFilename = '';
	}
}

module.exports = File;
