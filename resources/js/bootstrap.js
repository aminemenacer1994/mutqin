import axios from 'axios';
window.axios = axios;

window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

// Only the Bootstrap plugins used by the shell (navbar offcanvas + language dropdown).
import Offcanvas from 'bootstrap/js/dist/offcanvas';
import Dropdown from 'bootstrap/js/dist/dropdown';
window.bootstrap = { Offcanvas, Dropdown };

// CSRF token
let token = document.head.querySelector('meta[name="csrf-token"]');
if (token) {
    window.axios.defaults.headers.common['X-CSRF-TOKEN'] = token.content;
}
