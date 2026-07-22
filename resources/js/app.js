require('./bootstrap.js');

import { createApp, defineAsyncComponent } from 'vue';
import Homepage from './views/Homepage.vue';
import About from './views/About.vue';
import AboutUsPage from './views/AboutUs.vue';
import OurMissionPage from './views/OurMission.vue';
import DonationPage from './views/DonationPage.vue';
import { setupI18n, setLocale } from './i18n';
import { i18nMixin } from './mixins/i18nMixin';

// The memorisation workspace is by far the heaviest component. It is only used
// on the memorisation page, so load it as a separate async chunk to keep the
// main bundle (and every other page) lean.
const MemorisationBootFallback = {
    template: `
        <div class="memorisation-boot-fallback" role="status" aria-live="polite">
            <div class="memorisation-boot-card">
                <i class="bi bi-hourglass-split" aria-hidden="true"></i>
                <strong>Loading memorisation workspace…</strong>
                <span>Preparing your session tools.</span>
            </div>
        </div>
    `,
};

const MemorisationLoadError = {
    props: { error: { type: Object, default: null } },
    template: `
        <div class="memorisation-boot-fallback memorisation-boot-fallback-error" role="alert">
            <div class="memorisation-boot-card">
                <i class="bi bi-exclamation-triangle" aria-hidden="true"></i>
                <strong>Memorisation workspace failed to load</strong>
                <span>Refresh the page. If this keeps happening after <code>npm run watch</code> finishes compiling, hard-refresh once.</span>
                <button type="button" class="btn btn-sm btn-primary mt-2" @click="reload">Refresh</button>
            </div>
        </div>
    `,
    methods: {
        reload() {
            window.location.reload();
        },
    },
};

/**
 * Mix watch rewrites public/js/memorisation.js while the browser may still be
 * requesting it — that surfaces as ChunkLoadError. Retry a few times before failing.
 */
function loadMemorisationChunk(attempt = 0) {
    return import(/* webpackChunkName: "memorisation" */ './views/Memorisation.vue').catch((error) => {
        const name = String(error?.name || '');
        const message = String(error?.message || '');
        const isChunkError = name === 'ChunkLoadError'
            || /Loading chunk \d+ failed/i.test(message)
            || /memorisation\.js/i.test(message);
        if (isChunkError && attempt < 3) {
            const delayMs = 400 * (attempt + 1);
            return new Promise((resolve, reject) => {
                window.setTimeout(() => {
                    loadMemorisationChunk(attempt + 1).then(resolve, reject);
                }, delayMs);
            });
        }
        throw error;
    });
}

const Memorisation = defineAsyncComponent({
    loader: () => loadMemorisationChunk(),
    loadingComponent: MemorisationBootFallback,
    errorComponent: MemorisationLoadError,
    delay: 0,
    timeout: 120000,
});

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
    app.mixin(i18nMixin);
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

function showBootstrapFailure(error) {
    console.error('Mutqin app bootstrap failed:', error);
    const mountTarget = document.getElementById('app');
    if (!mountTarget) return;
    mountTarget.innerHTML = `
        <main id="mainContent" tabindex="-1">
            <div class="memorisation-boot-fallback memorisation-boot-fallback-error" role="alert">
                <div class="memorisation-boot-card">
                    <strong>Mutqin failed to start</strong>
                    <span>Refresh the page. If this continues, rebuild frontend assets with <code>npm run dev</code>.</span>
                </div>
            </div>
        </main>
    `;
}

bootstrapApp().catch(showBootstrapFailure);

if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
    window.addEventListener('load', () => {
        const serviceWorkerUrl = new URL('/sw.js', window.location.origin).href;
        navigator.serviceWorker.register(serviceWorkerUrl)
            .then((registration) => {
                registration.update().catch(() => {});
            })
            .catch((error) => {
                console.warn('Failed to register service worker:', error);
            });
    });
}
