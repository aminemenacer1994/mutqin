require('./bootstrap.js');

import { createApp, defineAsyncComponent } from 'vue';
import Homepage from './components/Homepage.vue';
import About from './components/About.vue';
import AboutUsPage from './components/AboutUs.vue';
import OurMissionPage from './components/OurMission.vue';
import DonationPage from './components/DonationPage.vue';
import { setupI18n, setLocale } from './i18n';

// The memorisation workspace is by far the heaviest component. It is only used
// on the memorisation page, so load it as a separate async chunk to keep the
// main bundle (and every other page) lean.
const Memorisation = defineAsyncComponent(() => import('./components/Memorisation.vue'));

async function bootstrapApp() {
    const app = createApp({});

    // [TEMP DIAGNOSTIC] Surface the exact reactive property behind a
    // "Maximum recursive updates exceeded" loop. Remove once the bug is fixed.
    app.config.warnHandler = (msg, instance, trace) => {
        if (typeof msg === 'string' && msg.includes('recursive')) {
            const dbg = window.__renderDbg || {};
            // Show which reactive keys fired most in the last render burst.
            const ranked = Object.entries(dbg.keys || {})
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10);
            console.error('[RECURSION] ' + msg);
            console.error('[RECURSION] top trigger keys (key -> count):', ranked);
            console.error('[RECURSION] last trigger:', dbg.last || '(none captured)');
        }
        console.warn('[Vue warn]', msg, trace);
    };

    const i18n = await setupI18n();

    app.use(i18n);
    app.config.globalProperties.$setLocale = (locale) => setLocale(i18n, locale);
    window.mutqinSetLocale = (locale) => setLocale(i18n, locale);
    window.mutqinGetLocale = () => i18n.global.locale.value;
    window.dispatchEvent(new CustomEvent('mutqin:i18n-ready', { detail: { locale: i18n.global.locale.value } }));

    app.component('homepage', Homepage);
    app.component('memorisation', Memorisation);
    app.component('about', About);
    app.component('about-us-page', AboutUsPage);
    app.component('our-mission-page', OurMissionPage);
    app.component('donation-page', DonationPage);
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
