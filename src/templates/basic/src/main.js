import $ from "jquery";

import "./css/main.scss";
import Gallery from "./Gallery";

class Main {
	constructor() {
		if ('ontouchstart' in window) {
			$(document.body).addClass('has--touch');
		}

		this.gallery = new Gallery(
			$('main'),
			$('.gallery')
		);
	}
}

$(document).ready(() => {
	new Main();
});
