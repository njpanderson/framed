import $ from "jquery";

class GalleryDOM {
	constructor($thumbs, $gallery, events) {
		this.classes = {
			dir: 'thumb--dir',
			selected: 'gallery--content--selected',
			navSelected: 'gallery--nav--selected',
			asset: 'gallery--asset',
			hud: 'gallery--hud',
			reduced: 'gallery--reduced',
			videoTools: 'video-tools',
			videoToolLarger: 'video-tools--larger',
			videoToolSmaller: 'video-tools--smaller',
			videoToolFull: 'video-tools--full'
		};

		this.selectors = {
			thumb: '.thumb',
			thumbDir: '.thumb--dir',
			thumbFile: '.thumb--file',
			thumbImage: '.thumb--image',
			content: '.gallery--content',
			asset: '.gallery--asset',
			close: '.gallery--close button',
			hideHud: '.gallery--hide-hud button',
			showHud: '.top-nav--show-hud button',
			next: '.gallery--next button',
			prev: '.gallery--prev button',
			toggleSize: '.gallery--toggle-size',
			assetCount: '.gallery--nav--asset-count',
			assetCountLinks: '.gallery--nav--assetlinks .gallery--nav--asset-count',
			nav: '.gallery--nav',
			link: 'a[href]',
			video: 'video',
			videoToolLarger: '.video-tools--larger',
			videoToolSmaller: '.video-tools--smaller',
			videoToolFull: '.video-tools--full'
		};

		this.$thumbs = $thumbs;
		this.$doc = $(document.body);
		this.$gallery = $gallery.hide();
		this.$content = $gallery.find(this.selectors.content);
		this.$nav = $gallery.find(this.selectors.nav);
		this.thumbDirs = {};

		this.events = Object.assign({}, {
			onOpen: null,
			onClose: null,
			onHideHud: null,
			onShowHud: null,
			onNavigate: null,
			onAssetCount: null,
			onAssetSelect: null,
			onKeyPress: null,
			onToggleSize: null
		}, events);

		this.$thumbs.find(this.selectors.thumbDir).each((index, thumb) => {
			let $thumb = $(thumb);

			// Store an index for recall
			$thumb.data('index', index);

			// Save metrics, etc
			this.thumbDirs[index] = {
				$children: $thumb.find(this.selectors.thumbImage),
				pos: $thumb.position(),
				width: $thumb.width(),
				height: $thumb.height(),
				$thumb: $(thumb)
			};
		});

		this.attachEvents();
	}

	attachEvents() {
		// Gallery delegates
		this.$gallery
			.on('click', this.selectors.close, this.bind('onClose'))
			.on('click', this.selectors.hideHud, this.bind('onHideHud'))
			.on('click', this.selectors.next, this.bind('onNavigate', 1))
			.on('click', this.selectors.prev, this.bind('onNavigate', -1))
			.on('click', this.selectors.assetCount, (event) => {
				event.preventDefault();
				this.fire('onAssetCount', $(event.currentTarget).data('count'));
			})
			.on('click', this.selectors.asset, (event) => {
				event.preventDefault();
				this.fire('onAssetSelect', $(event.currentTarget).prevAll().length);
			})
			.on('click', this.selectors.toggleSize, this.toggleSize.bind(this))
			.on('click', this.selectors.video, (event) => this.toggleVideoPlayback(event.currentTarget))
			.on(
				'click',
				[
					this.selectors.videoToolLarger,
					this.selectors.videoToolSmaller,
					this.selectors.videoToolFull
				].join(','),
				(event) => {
					let $link = $(event.currentTarget),
						$video = $link.closest(this.selectors.asset).find(this.selectors.video);

					event.stopPropagation();

					if ($video.length) {
						if ($link.hasClass(this.classes.videoToolFull)) {
							this.setVideoFull($video);
						} else {
							this.setVideoSize(
								$video,
								($link.hasClass(this.classes.videoToolLarger) ? 25 : -25)
							);
						}
					}
				});

		// Thumbnail delegates
		this.$thumbs
			.on('click', this.selectors.thumb, (event) => {
				let $thumb = $(event.currentTarget),
					dir = ($thumb.hasClass(this.classes.dir)),
					$link = $thumb.find(this.selectors.link);

				if (!dir) {
					event.preventDefault();
					this.fire('onOpen', $link.attr('href'));
				}
			})
			.on('mousemove', this.selectors.thumbDir, (event) => {
				let thumb = this.thumbDirs[$(event.currentTarget).data('index')],
					percentageWidth, percentageHeight;

				percentageWidth = (((event.clientX - thumb.pos.left) / thumb.width) * 100);
				percentageHeight = (((event.clientY - thumb.pos.top) / thumb.height) * 100);

				this.setThumbLayerView(thumb, percentageWidth, percentageHeight);
			});

		// Document delegates
		this.$doc
			.on('click', this.selectors.showHud, this.bind('onShowHud'));

		// Gallery bind
		this.$gallery.on('click', this.selectors.content, () => {
			if ($(event.target).is(this.selectors.content)) {
				this.fire('onClose');
			}
		});

		// Keyboard control
		$(window).on('keydown', this.keyPress.bind(this));
	}

	findThumbAssets() {
		let assets = [];

		this.$thumbs.find(this.selectors.thumbFile).each((index, thumb) => {
			let $thumb = $(thumb),
				$link = $thumb.find(this.selectors.link);

			assets.push({
				url: $link.attr('href'),
				contentType: $link.data('content-type'),
				open: false
			})
		}, this);

		return assets;
	}

	createGalleryAsset(asset) {
		let $container = $('<div class="' + this.classes.asset + '">'),
			$asset;

		switch (asset.contentType) {
			case 'image/jpeg':
			case 'image/png':
				$container.addClass(this.classes.asset + '--image');
				$asset = this.createImageAsset(asset.url);
				break;

			case 'video/mp4':
			case 'video/quicktime':
			case 'video/ogg':
			case 'video/webm':
				$container.addClass(this.classes.asset + '--video');
				$asset = this.createVideoAsset(asset.url);
				break;
		}


		return $container.append($asset);
	}

	createImageAsset(url) {
		return $("<img>")
			.attr('src', url);
	}

	createVideoAsset(url) {
		return $("<video>")
			.attr('controls', 'controls')
			.attr('preload', 'preload')
			.attr('src', url)
			.add(
				$('<div class="' + this.classes.videoTools + '">').append(
					$('<button class="' + this.classes.videoToolSmaller + '"/>')
						.append('<svg class="icon"><use xlink:href="#svg-zoom-out"></use></svg>&nbsp;Smaller'),
					$('<button class="' + this.classes.videoToolLarger + '"/>')
						.append('<svg class="icon"><use xlink:href="#svg-zoom-in"></use></svg>&nbsp;Larger'),
					$('<button class="' + this.classes.videoToolFull + '"/>')
						.append('<svg class="icon"><use xlink:href="#svg-resize-both"></use></svg>&nbsp;Full')
				)
			);
	}

	selectGalleryItem(index, selected = true) {
		if (selected) {
			this.$content.children().eq(index).addClass(this.classes.selected);
		} else {
			this.$content.children().eq(index).removeClass(this.classes.selected);
		}

		return this;
	}

	setThumbLayerView(thumbDir, percentageWidth, percentageHeight) {
		let index;

		index = Math.round(((thumbDir.$children.length - 1) / 100) * percentageWidth);

		thumbDir.$children.hide();
		thumbDir.$children.eq(index).show();
	}

	toggleSize() {
		this.$gallery.toggleClass(this.classes.reduced);
		this.fire('onToggleSize');
	}

	setHudDisplay(shown, maxAssetCount) {
		this.$doc[(shown ? 'add' : 'remove') + 'Class'](this.classes.hud);

		this.$nav.find(this.selectors.assetCountLinks)
			.removeClass(this.classes.navSelected)
			.eq(maxAssetCount - 1)
			.addClass(this.classes.navSelected);
	}

	stopAllVideos() {
		this.$gallery.find(this.selectors.video).each((index, video) => {
			video.pause();
		});
	}

	toggleVideoPlayback(video) {
		if (video.paused) {
			video.play();
		} else {
			video.pause();
		}
	}

	setVideoSize($video, percentageAdjust) {
		let currentHeight = $video.height(),
			newHeight;

		newHeight = (currentHeight + (currentHeight / 100) * percentageAdjust);

		$video.css({
			height: newHeight + 'px'
		});
	}

	setVideoFull($video) {
		if (($video.prop('style')).height === '100%') {
			$video.css({
				height: ''
			});
		} else {
			$video.css({
				height: '100%'
			});
		}
	}

	open() {
		this.$gallery.show();
	}

	close() {
		this.stopAllVideos();
		this.$gallery.hide();
	}

	keyPress(event) {
		if (event.key !== 'Control') {
			this.fire('onKeyPress', event.key, event.code, event.ctrlKey);
		}
	}

	bind(boundEvent, preventDefault) {
		let args = Array.prototype.slice.call(arguments, 1);

		return (function(event) {
			event && ('preventDefault' in event) && event.preventDefault();

			this.fire.apply(this, [boundEvent].concat(
				args,
				Array.prototype.slice.call(arguments)
			));
		}.bind(this));
	}

	fire(boundEvent) {
		if (typeof this.events[boundEvent] === 'function') {
			this.events[boundEvent].apply(this, Array.prototype.slice.call(arguments, 1));
		}
	}
}

export default GalleryDOM;
