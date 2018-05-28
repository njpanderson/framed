class Item {
	constructor(type, filename, label, thumbs, mimeType) {
		this.type = type;
		this.typeIsDir = (type === 'dir');
		this.filename = filename;
		this.label = label;
		this.thumbs = thumbs;
		this.empty = !(thumbs.length);
		this.content_type = mimeType;
	}
}

module.exports = Item;
