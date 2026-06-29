require('./bootstrap.js');

import { createApp, defineAsyncComponent } from 'vue';
import Homepage from './views/Homepage.vue';
import About from './views/About.vue';
import AboutUsPage from './views/AboutUs.vue';
import OurMissionPage from './views/OurMission.vue';
import DonationPage from './views/DonationPage.vue';
import { setupI18n, setLocale } from './i18n';

// The memorisation workspace is by far the heaviest component. It is only used
// on the memorisation page, so load it as a separate async chunk to keep the
// main bundle (and every other page) lean.
const Memorisation = defineAsyncComponent(() => import('./views/Memorisation.vue'));

async function bootstrapApp() {
    const app = createApp({});

    // [TEMP DIAGNOSTIC] Surface the exact reactive property behind a
    // "Maximum recursive updates exceeded" loop. Remove once the bug is fixed.
    window.__showLoopBanner = (lines) => {
        try {
            let el = document.getElementById('__loop_banner');
            if (!el) {
                el = document.createElement('div');
                el.id = '__loop_banner';
                el.style.cssText = [
                    'position:fixed', 'top:0', 'left:0', 'right:0', 'z-index:2147483647',
                    'background:#b00020', 'color:#fff', 'font:13px/1.4 monospace',
                    'padding:10px 14px', 'white-space:pre-wrap', 'word-break:break-word',
                    'box-shadow:0 2px 8px rgba(0,0,0,.4)'
                ].join(';');
                document.body.appendChild(el);
            }
            el.textContent = '[RENDER/RECURSION DIAGNOSTIC]\n' + lines;
        } catch (e) { /* noop */ }
    };

    app.config.warnHandler = (msg, instance, trace) => {
        if (typeof msg === 'string' && msg.includes('recursive')) {
            const dbg = window.__renderDbg || {};
            const ranked = Object.entries(dbg.keys || {})
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10);
            const text = 'Maximum recursive updates exceeded.\n'
                + 'Top trigger keys (key -> count):\n'
                + (ranked.length ? ranked.map(([k, c]) => `   ${k}  ->  ${c}`).join('\n') : '   (none captured -> likely a WATCHER loop, not render)')
                + '\nLast trigger: ' + (dbg.last || '(none)');
            console.error('[RECURSION] ' + text);
            window.__showLoopBanner(text);
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
