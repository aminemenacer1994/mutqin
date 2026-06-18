require('./bootstrap.js');

import { createApp } from 'vue';
import Homepage from './components/Homepage.vue';
import Memorisation from './components/Memorisation.vue';
import About from './components/About.vue';
import { setupI18n, setLocale } from './i18n';

async function bootstrapApp() {
    const app = createApp({});
    const i18n = await setupI18n();

    app.use(i18n);
    app.config.globalProperties.$setLocale = (locale) => setLocale(i18n, locale);
    window.mutqinSetLocale = (locale) => setLocale(i18n, locale);
    window.mutqinGetLocale = () => i18n.global.locale.value;
    window.dispatchEvent(new CustomEvent('mutqin:i18n-ready', { detail: { locale: i18n.global.locale.value } }));

    app.component('homepage', Homepage);
    app.component('memorisation', Memorisation);
    app.component('about', About);
    app.mount('#app');
}

bootstrapApp();

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                registration.update().catch(() => {});
            })
            .catch((error) => {
                console.warn('Failed to register service worker:', error);
            });
    });
}
