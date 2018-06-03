const chalk = require('chalk');
const logUpdate = require('log-update');
const windowSize = require('window-size');

class Progress {
	constructor() {
		this.ui = {
			left: '[',
			right: ']',
			frames: ['▮', '▯', ['-', '\\', '|', '/']],
			padding: 2
		};

		this.interval = null;
		this.percentage = null;
		this.precision = 0;
		this.frame = 0;
		this.item = '';
		this.running = false;
	}

	start(item = '', percentage = null) {
		this.running = true;
		this.set(item, percentage);

		this.interval = setInterval(this.update.bind(this), 80);
	}

	set(item, percentage = null) {
		this.item = item || '';

		if (percentage !== null) {
			this.percentage = parseFloat(percentage);
		} else {
			this.percentage = null;
		}

		this.update();
	}

	update() {
		const size = windowSize.get(),
			pads = ('').padEnd(this.ui.padding, ' ');

		if (!this.running) {
			return;
		}

		let frame = '',
			status = '',
			bar = '',
			emptyBar = '',
			widthSpace, itemSpace;

		if (this.percentage === null || this.percentage < 100) {
			frame = this.ui.frames[2][this.frame = ++this.frame % this.ui.frames[2].length];
		}

		if (this.percentage !== null) {
			if (this.precision > 0) {
				status = ` ${this.percentage.toPrecision(this.precision)}%`;
			} else {
				status = ` ${this.percentage.toFixed()}%`;
			}
		}

		widthSpace = size.width - (
			((this.ui.left.length + this.ui.right.length) * 2) +
			status.length +
			(frame.length * 2) +
			(pads.length * 2)
		);

		itemSpace = size.width - (
			(pads.length * 2)
		);

		if (this.percentage !== null) {
			bar = ('').padEnd(
				(widthSpace / 100) * this.percentage,
				this.ui.frames[0]
			);

			emptyBar = ('').padEnd(
				widthSpace - bar.length,
				this.ui.frames[1]
			);

			if (this.percentage < 100) {
				bar = chalk.yellow(bar);
			} else {
				bar = chalk.green(bar);
			}
		}

		logUpdate(
			`${pads}${this.item.slice(0, (itemSpace - 1))}${pads}` + '\n' +
			`${pads}${this.ui.left}${bar}${emptyBar}${frame}${this.ui.right}${status}${pads}`
		);
	}

	clear() {
		clearInterval(this.interval);
		this.running = false;
		logUpdate.clear();
	}

	done() {
		clearInterval(this.interval);

		if (this.percentage !== null) {
			this.set('Complete', 100);
		}

		this.running = false;
		logUpdate.done();
	}
}

module.exports = Progress;
