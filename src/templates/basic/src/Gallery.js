const mergeOptions = require('merge-options');
import $ from "jquery";

import GalleryDOM from './GalleryDOM';

class Gallery {
	constructor($thumbs, $gallery) {
		this.dom = new GalleryDOM($thumbs, $gallery, {
			onClose: this.close.bind(this),
			onOpen: this.open.bind(this),
			onNavigate: this.navigate.bind(this),
			onAssetCount: this.setAssetCount.bind(this),
			onAssetSelect: this.setSelectedAsset.bind(this),
			onKeyPress: this.keyPress.bind(this),
			onHideHud: (function() { this.toggleHud(false); }).bind(this),
			onShowHud: (function() { this.toggleHud(true); }).bind(this),
			onToggleSize: this.renderAll.bind(this)
		});

		this.options = {
			absoluteMaxAssetCount: 4
		};

		this.assets = [];
		this._state = {
			hud: true,
			shown: [],
			maxAssetCount: 1,
			selected: 0,
			active: false
		};

		this.assets = this.dom.findThumbAssets();
	}

	/**
	 * Open the gallery with a single resource
	 */
	open(url) {
		this.addAsset(this.getAssetByUrl(this.assets, url));
		this.setState({ active: true });
	}

	close() {
		this.setState({ active: false });
	}

	keyPress(key, code, ctrl) {
		let state = this.getState();

		if (state.active) {
			if (!isNaN(key) && (key = parseInt(key, 10))) {
				// Numbers 0-9 pressed
				if (!ctrl && key <= this.options.absoluteMaxAssetCount) {
					this.setAssetCount(key);
				} else if (ctrl && key <= state.shown.length) {
					this.setSelectedAsset((key - 1));
				}
			} else if (key === "ArrowRight" || key === "ArrowLeft") {
				this.navigate((key === "ArrowRight") ? 1 : -1);
			} else if (key === 'h') {
				this.toggleHud();
			} else if (key === "Escape") {
				this.close();
			} else if (key === "s") {
				this.dom.toggleSize();
			}
		}
	}

	toggleHud(hide) {
		let state = this.getState();
		this.setState({ hud: (hide !== undefined ? hide : !state.hud) });
	}

	navigate(direction) {
		let state = this.getState(),
			thumbIndex;

		thumbIndex = this.getAssetIndexByProp(
			this.assets,
			'url',
			state.shown[state.selected].url
		) + direction;

		if (thumbIndex > (this.assets.length - 1)) {
			thumbIndex = 0;
		} else if (thumbIndex < 0) {
			thumbIndex = (this.assets.length - 1);
		}

		state.shown[state.selected] = this.assets[thumbIndex];

		this.setState({ shown: state.shown });
	}

	addAsset(asset) {
		let state = this.getState();

		if (asset && this.getAssetByUrl(state.shown, asset.url) === null) {
			if (state.shown.length < state.maxAssetCount) {
				// More allowed - add
				state.shown.push(asset);
			} else {
				// Max reached - just alter selected item
				state.shown[state.selected] = asset;
			}
		}

		this.setState({ shown: state.shown });
	}

	removeAsset(asset) {
		let state = this.getState();

		state.shown.splice(
			this.getAssetIndexByProp(state.shown, 'url', asset.url),
			1
		);

		this.setState({ shown: state.shown });
	}

	setAssetCount(count) {
		let state, a, start;

		state = this.getState();

		if (state.shown.length > count) {
			// Trim excess shown items
			state.shown.splice(count);
		} else {
			// Add more items (duplicating the last)
			start = state.shown.length;

			for (a = start; a < count; a += 1) {
				state.shown.push(state.shown[(state.shown.length - 1)]);
			}
		}

		this.setState({
			maxAssetCount: count,
			selected: (state.selected < count) ? state.selected : (count - 1),
			shown: state.shown
		});
	}

	setSelectedAsset(index) {
		let state = this.getState();

		if (index < state.shown.length && index >= 0) {
			this.setState({ selected: index });
		}
	}

	getAssetByUrl(dict, url) {
		return dict[this.getAssetIndexByProp(dict, 'url', url)] || null;
	}

	getAssetIndexByProp(dict, prop, value) {
		let a;

		for (a = 0; a < dict.length; a += 1) {
			if (dict[a][prop] === value) {
				return a;
			}
		}

		return -1;
	}

	getState() {
		return mergeOptions({}, this._state);
	}

	setState(state) {
		let prevState = mergeOptions({}, this._state);
		this._state = mergeOptions({}, this._state, state);
		this.render(prevState, mergeOptions({}, this._state));
	}

	renderAll() {
		this.render(
			this.getState(),
			this.getState(),
			true
		);
	}

	render(prevState, newState, force) {
		let a;

		// Update active status
		if (newState.active !== prevState.active) {
			this.dom[newState.active ? 'open' : 'close']();
		}

		// Update hud
		this.dom.setHudDisplay(newState.hud, newState.maxAssetCount);

		// Update asset display
		if (!this.isJSONEqual(prevState.shown, newState.shown) || force) {
			this.dom.$content.empty();

			for (a = 0; a < newState.shown.length; a += 1) {
				this.dom.$content.append(
					this.dom.createGalleryAsset(newState.shown[a])
				);
			}
		}

		// Update selected item state
		this.dom
			.selectGalleryItem(prevState.selected, false)
			.selectGalleryItem(newState.selected);
	}

	/**
	 * Compares the JSON-string of two objects and returns the equality
	 */
	isJSONEqual(ob, ob2 = null) {
		return JSON.stringify(ob) === JSON.stringify(ob2);
	}
}

export default Gallery;
