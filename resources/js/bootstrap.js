import axios from 'axios';
import { attachHttpErrorTracking } from './scripts/observability/errorTracking';
import { attachNetworkFailureEmitter } from './utils/networkStatus';
window.axios = axios;

window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
attachNetworkFailureEmitter(window.axios);
attachHttpErrorTracking(window.axios);

// Bootstrap plugins used by the shell and marketing pages (navbar, FAQ, landing carousel).
import Offcanvas from 'bootstrap/js/dist/offcanvas';
import Dropdown from 'bootstrap/js/dist/dropdown';
import Collapse from 'bootstrap/js/dist/collapse';
import Carousel from 'bootstrap/js/dist/carousel';
window.bootstrap = { Offcanvas, Dropdown, Collapse, Carousel };

// CSRF token
let token = document.head.querySelector('meta[name="csrf-token"]');
if (token) {
    window.axios.defaults.headers.common['X-CSRF-TOKEN'] = token.content;
}
