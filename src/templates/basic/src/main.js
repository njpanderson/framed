import $ from "jquery";

import "./css/main.scss";
import Gallery from "./Gallery";

console.log('main');

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
