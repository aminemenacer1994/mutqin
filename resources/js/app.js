require('./bootstrap.js');

import { createApp } from 'vue';
import Homepage from './components/Homepage.vue';
import Memorisation from './components/Memorisation.vue';

const app = createApp({});

app.component('homepage', Homepage);
app.component('memorisation', Memorisation);

app.mount('#app');

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch((error) => {
            console.warn('Failed to register service worker:', error);
        });
    });
}
