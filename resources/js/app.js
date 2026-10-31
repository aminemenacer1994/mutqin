require('./bootstrap.js');

import { createApp, defineAsyncComponent } from 'vue';
import NetworkStatusBanner from './components/NetworkStatusBanner.vue';
import { setupI18n, setLocale, resolveEnMessage } from './i18n';
import { i18nMixin } from './mixins/i18nMixin';
import { initPwa } from './pwa';
import { clearSharedMutqinBrowserResidue } from './utils/mutqinStorageKeys';
import {
    clearChunkReloadFlag,
    installChunkLoadRecovery,
    recoverFromStaleChunk,
    syncChunkReloadFlagWithAssetBuild,
    wrapChunkImport,
    debugAgentLog,
} from './utils/chunkLoadRecovery';
import PageLoadError from './components/PageLoadError';
import { installErrorTracking, reportError, attachVueErrorHandler } from './scripts/observability/errorTracking';
import {
    openFeedbackModal,
    setFeedbackModalEnsureMounted,
} from './scripts/feedback/feedbackLauncher';
import { bootPersistedQuranFont } from './scripts/quran/quranFonts';
import { bootPersistedFontSize } from './scripts/settings/workspacePreferences';
import { useSeo } from './seo/useSeo';
import { initSeoConversionTracking } from './scripts/seoTools/track.js';
import { initWaitingListAttribution } from './scripts/analytics/waitingListAttribution.js';

initWaitingListAttribution();

// Apply the user's Qur’anic font CSS vars before Vue mounts Memorisation.
try {
    const userId = typeof window !== 'undefined' ? window.mutqinUserId : null;
    bootPersistedQuranFont({ userId });
    bootPersistedFontSize({ userId });
} catch {
    /* ignore */
}

function resolveEn(key) {
    return resolveEnMessage(key);
}

function bindLogoutStorageCleanup() {
    if (typeof document === 'undefined') return;
    const clearResidue = () => {
        try {
            clearSharedMutqinBrowserResidue();
        } catch (_) { /* ignore */ }
    };
    document.addEventListener('submit', (event) => {
        const form = event.target;
        if (!(form instanceof HTMLFormElement)) return;
        const action = String(form.getAttribute('action') || '');
        if (!action.includes('/logout')) return;
        clearResidue();
    }, true);
}

bindLogoutStorageCleanup();
if (typeof window !== 'undefined') {
    window.mutqinClearSharedBrowserResidue = clearSharedMutqinBrowserResidue;
    window.mutqinOpenFeedback = openFeedbackModal;
    installChunkLoadRecovery({
        noticeMessage: resolveEn('common.status.chunkUpdating'),
    });
    syncChunkReloadFlagWithAssetBuild();
}

// Watch/dev Mix emits stable chunk names (homepage.js, memorisation.js, ...).
// Patch webpack's chunk URL helper so the browser cannot keep stale lazy-page
// chunks, including old 404 responses, after a local rebuild.
(function patchStableChunkBust() {
    try {
        if (typeof __webpack_require__ === 'undefined' || typeof __webpack_require__.u !== 'function') return;
        const bust = (typeof document !== 'undefined' && (
            document.documentElement?.dataset?.mutqinAssetBuild
            || document.querySelector('meta[name="mutqin-asset-build"]')?.content
        )) || 'v170';
        const original = __webpack_require__.u.bind(__webpack_require__);
        __webpack_require__.u = (chunkId) => {
            const url = String(original(chunkId) || '');
            if (!/\.js(?:$|\?)/i.test(url) || /\.[a-f0-9]{8}\.js(?:$|\?)/i.test(url)) return url;
            const sep = url.includes('?') ? '&' : '?';
            return `${url}${sep}id=${encodeURIComponent(bust)}`;
        };
    } catch (_) { /* best-effort */ }
})();

const PageBootFallback = {
    computed: {
        loadingTitle() {
            return this.t('common.status.loadingTitle');
        },
        loadingDesc() {
            return this.t('common.status.loadingDesc');
        },
    },
    template: `
        <div class="memorisation-boot-fallback" role="status" aria-live="polite">
            <div class="memorisation-boot-card">
                <div class="memorisation-boot-card__icon" aria-hidden="true">
                    <i class="bi bi-hourglass-split"></i>
                </div>
                <div class="memorisation-boot-card__copy">
                    <strong>{{ loadingTitle }}</strong>
                    <p>{{ loadingDesc }}</p>
                </div>
            </div>
        </div>
    `,
};

const MemorisationBootFallback = {
    computed: {
        loadingTitle() {
            return this.t('memorisation.a11y.workspaceLoading');
        },
        loadingDesc() {
            return this.t('memorisation.a11y.workspacePreparing');
        },
    },
    template: `
        <div class="memorisation-boot-fallback" role="status" aria-live="polite">
            <div class="memorisation-boot-card">
                <div class="memorisation-boot-card__icon" aria-hidden="true">
                    <i class="bi bi-hourglass-split"></i>
                </div>
                <div class="memorisation-boot-card__copy">
                    <strong>{{ loadingTitle }}</strong>
                    <p>{{ loadingDesc }}</p>
                </div>
            </div>
        </div>
    `,
};

/**
 * Lazy page/component with loading + recoverable error UI and deploy-safe
 * ChunkLoadError recovery (at most one controlled reload).
 *
 * @param {() => Promise<any>} importer
 * @param {{ feature?: string, loadingComponent?: object, delay?: number }} [options]
 */
function lazyPage(importer, options = {}) {
    const feature = options.feature || 'page';
    return defineAsyncComponent({
        loader: () => wrapChunkImport(importer, {
            feature,
            noticeMessage: resolveEn('common.status.chunkUpdating'),
            onGiveUp: (error) => {
                reportError(error, { kind: 'chunk_load', feature });
            },
        }).catch((error) => {
            if (error && typeof error === 'object') {
                error.mutqinFeature = feature;
            }
            throw error;
        }),
        loadingComponent: options.loadingComponent || PageBootFallback,
        errorComponent: PageLoadError,
        delay: options.delay ?? 120,
        timeout: 120000,
    });
}

const MadaniSpread = lazyPage(
    () => import(/* webpackChunkName: "madani-page" */ './components/madani/MadaniSpread.vue'),
    { feature: 'madani-page' }
);
const Homepage = lazyPage(
    () => import(/* webpackChunkName: "homepage" */ './views/Homepage.vue'),
    { feature: 'homepage' }
);
const About = lazyPage(
    () => import(/* webpackChunkName: "about" */ './views/About.vue'),
    { feature: 'about' }
);
const AboutUsPage = lazyPage(
    () => import(/* webpackChunkName: "about-us" */ './views/AboutUs.vue'),
    { feature: 'about-us' }
);
const PricingPage = lazyPage(
    () => import(/* webpackChunkName: "pricing" */ './views/PricingPage.vue'),
    { feature: 'pricing' }
);
const OurMissionPage = lazyPage(
    () => import(/* webpackChunkName: "our-mission" */ './views/OurMission.vue'),
    { feature: 'our-mission' }
);
const DonationPage = lazyPage(
    () => import(/* webpackChunkName: "donation" */ './views/DonationPage.vue'),
    { feature: 'donation' }
);
const WaitingListPage = lazyPage(
    () => import(/* webpackChunkName: "waiting-list" */ './views/WaitingList.vue'),
    { feature: 'waiting-list' }
);
const ArticlesPage = lazyPage(
    () => import(/* webpackChunkName: "articles" */ './views/Articles.vue'),
    { feature: 'articles' }
);
const ArticleDetailPage = lazyPage(
    () => import(/* webpackChunkName: "article-detail" */ './views/ArticleDetail.vue'),
    { feature: 'article-detail' }
);
const UserDashboard = lazyPage(
    () => import(/* webpackChunkName: "user-dashboard" */ './views/Dashboard.vue'),
    { feature: 'dashboard' }
);
const TeacherDashboard = lazyPage(
    () => import(/* webpackChunkName: "teacher-dashboard" */ './views/TeacherDashboard.vue'),
    { feature: 'teacher-dashboard' }
);
const AdminDashboard = lazyPage(
    () => import(/* webpackChunkName: "admin-dashboard" */ './views/AdminDashboard.vue'),
    { feature: 'admin-dashboard' }
);
const AdminFeedback = lazyPage(
    () => import(/* webpackChunkName: "admin-feedback" */ './views/AdminFeedback.vue'),
    { feature: 'admin-feedback' }
);

// The memorisation workspace is by far the heaviest component. It is only used
// on the memorisation page, so load it as a separate async chunk to keep the
// main bundle (and every other page) lean.
const Memorisation = lazyPage(
    () => import(/* webpackChunkName: "memorisation" */ './views/Memorisation.vue').then((mod) => {
        if (typeof window !== 'undefined') {
            window.__MUTQIN_PRACTICE_COACH__ = 'v24';
            window.__MUTQIN_AI_RECITE_UI__ = 'v75';
            document.documentElement.dataset.practiceCoach = 'v2';
            document.documentElement.dataset.aiReciteUi = 'v75';
            document.documentElement.dataset.stackedAyahEnd = 'v8-removed';
            document.documentElement.dataset.mutqinUi = 'v124';
            document.documentElement.dataset.sessionOnlyMushaf = 'v4';
            document.documentElement.dataset.amdTestGate = 'test-with-ai-only';
            document.documentElement.dataset.postSessionChoice = 'v15';
        }
        return mod;
    }),
    { feature: 'memorisation', loadingComponent: MemorisationBootFallback, delay: 0 }
);

const PrivacyPolicyPage = lazyPage(
    () => import(/* webpackChunkName: "privacy" */ './views/PrivacyPolicy.vue'),
    { feature: 'privacy' }
);
const SeoLaunchPage = lazyPage(
    () => import(/* webpackChunkName: "seo-launch" */ './views/SeoLaunchPage.vue'),
    { feature: 'seo-launch' }
);

/**
 * Blade uses `:auth='@json(...)'` for the old in-DOM Vue template. Per-island mount
 * must read those attributes manually (colon-prefixed names are not Vue bind syntax here).
 *
 * @param {Element} el
 * @returns {Record<string, unknown> | null}
 */
function readIslandPropsFromElement(el) {
    if (!el?.attributes?.length) return null;
    const props = {};
    let found = false;
    for (const attr of el.attributes) {
        let name = String(attr.name || '');
        if (name.startsWith(':')) {
            name = name.slice(1);
        } else if (name.startsWith('v-bind:')) {
            name = name.slice(7);
        } else {
            continue;
        }
        if (!name) continue;
        const camel = name.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
        const raw = attr.value;
        try {
            props[camel] = JSON.parse(raw);
        } catch {
            props[camel] = raw;
        }
        found = true;
    }
    return found ? props : null;
}

/**
 * Mount each Blade `<homepage>` / `<memorisation>` island on its own app instance.
 * Avoids compiling #app innerHTML at runtime (production CSP blocks `unsafe-eval`).
 */
function mountMutqinVueIslands(i18n, componentByTag) {
    const root = document.getElementById('app');
    if (!root) return;

    const mountIsland = (el, component) => {
        if (!el || !component) return;
        const props = readIslandPropsFromElement(el);
        const islandApp = props ? createApp(component, props) : createApp(component);
        islandApp.use(i18n);
        islandApp.mixin(i18nMixin);
        islandApp.config.globalProperties.$setLocale = (locale) => setLocale(i18n, locale);
        attachVueErrorHandler(islandApp);
        islandApp.mount(el);
    };

    const mounted = new WeakSet();
    for (const [tag, component] of Object.entries(componentByTag)) {
        if (!component) continue;
        root.querySelectorAll(tag).forEach((el) => {
            if (mounted.has(el)) return;
            mounted.add(el);
            mountIsland(el, component);
        });
    }
}

async function bootstrapApp() {
    debugAgentLog('H3', 'app.js:bootstrapApp', 'start', {
        build: document.documentElement?.dataset?.mutqinAssetBuild || '',
        host: window.location.host,
    });

    const i18n = await setupI18n();
    debugAgentLog('H1', 'app.js:bootstrapApp', 'after setupI18n', {
        locale: i18n?.global?.locale?.value,
    });

    // /teacher: load the dashboard chunk before mount so UI updates ship with the
    // same refresh as app.js (avoids a stale lazy chunk after deploy).
    let TeacherDashboardComponent = TeacherDashboard;
    if (typeof document !== 'undefined' && document.querySelector('teacher-dashboard')) {
        const mod = await import(
            /* webpackChunkName: "teacher-dashboard" */
            './views/TeacherDashboard.vue'
        );
        TeacherDashboardComponent = mod.default;
    }

    installErrorTracking(null);
    window.mutqinSetLocale = (locale) => setLocale(i18n, locale);
    window.mutqinGetLocale = () => i18n.global.locale.value;
    window.dispatchEvent(new CustomEvent('mutqin:i18n-ready', { detail: { locale: i18n.global.locale.value } }));

    const componentByTag = {
        'network-status-banner': NetworkStatusBanner,
        // Standalone Madani page Blade island (not the Memorisation workspace children).
        'madani-spread': MadaniSpread,
        homepage: Homepage,
        memorisation: Memorisation,
        'user-dashboard': UserDashboard,
        'teacher-dashboard': TeacherDashboardComponent,
        'admin-dashboard': AdminDashboard,
        'admin-feedback': AdminFeedback,
        about: About,
        'about-us-page': AboutUsPage,
        'pricing-page': PricingPage,
        'our-mission-page': OurMissionPage,
        'donation-page': DonationPage,
        'waiting-list-page': WaitingListPage,
        'articles-page': ArticlesPage,
        'article-detail-page': ArticleDetailPage,
        'privacy-policy-page': PrivacyPolicyPage,
        'seo-launch-page': SeoLaunchPage,
    };

    mountMutqinVueIslands(i18n, componentByTag);
    debugAgentLog('H3', 'app.js:bootstrapApp', 'after mount', {});
    document.documentElement.dataset.mutqinAppMounted = '1';
    window.dispatchEvent(new CustomEvent('mutqin:app-mounted'));
    useSeo();
    scheduleDeferredShellWork();

    if (typeof window !== 'undefined' && window.mutqinMinimalPublicPage) {
        return;
    }

    if (typeof window !== 'undefined' && window.mutqinRestrictMarketingHost) {
        return;
    }

    scheduleFeedbackModalMount(i18n);
}

function runWhenIdle(task, timeoutMs = 2000) {
    if (typeof window === 'undefined') {
        task();
        return;
    }
    if (typeof window.requestIdleCallback === 'function') {
        window.requestIdleCallback(() => { task(); }, { timeout: timeoutMs });
        return;
    }
    window.setTimeout(task, 1);
}

function scheduleDeferredShellWork() {
    runWhenIdle(async () => {
        const justRegistered = Boolean(
            typeof window !== 'undefined' && window.mutqinJustRegisteredFlash
        );

        initSeoConversionTracking({
            path: typeof window !== 'undefined' ? window.location.pathname : '',
            justRegistered,
            registerMethod: (typeof window !== 'undefined' && window.mutqinRegisterMethod) || 'email',
        });

        try {
            const { initAckee, trackEvent: trackAckeeEvent, ACKEE_EVENTS } = await import(
                /* webpackChunkName: "ackee-analytics" */ './scripts/analytics/ackee.js'
            );
            initAckee();
            if (justRegistered) {
                trackAckeeEvent(ACKEE_EVENTS.REGISTER_COMPLETED);
            }
        } catch {
            /* analytics must never block boot */
        }

        if (justRegistered) {
            try {
                const { META_PIXEL_EVENTS, trackMetaPixelEvent } = await import(
                    /* webpackChunkName: "meta-pixel" */ './scripts/analytics/metaPixel.js'
                );
                trackMetaPixelEvent(META_PIXEL_EVENTS.REGISTRATION_COMPLETED);
            } catch {
                /* analytics must never block boot */
            }
        }
    });
}

let feedbackMountPromise = null;

function scheduleFeedbackModalMount(i18n) {
    const mount = () => {
        if (feedbackMountPromise) return feedbackMountPromise;
        feedbackMountPromise = (async () => {
            try {
                const { default: FeedbackModal } = await import(
                    /* webpackChunkName: "feedback-modal" */ './components/FeedbackModal.vue'
                );
                if (typeof document === 'undefined') return;
                if (document.getElementById('mutqinFeedbackRoot')) return;

                const feedbackRoot = document.createElement('div');
                feedbackRoot.id = 'mutqinFeedbackRoot';
                document.body.appendChild(feedbackRoot);
                const feedbackApp = createApp(FeedbackModal);
                feedbackApp.use(i18n);
                feedbackApp.mixin(i18nMixin);
                feedbackApp.mount(feedbackRoot);

                if (window.mutqinFeedbackPendingOpen) {
                    const pending = window.mutqinFeedbackPendingOpen;
                    window.mutqinFeedbackPendingOpen = false;
                    openFeedbackModal(typeof pending === 'object' ? pending : {});
                }
                window.dispatchEvent(new CustomEvent('mutqin:feedback-ready'));
            } catch (error) {
                feedbackMountPromise = null;
                reportError(error, { kind: 'bootstrap', feature: 'feedback-modal' });
            }
        })();
        return feedbackMountPromise;
    };

    setFeedbackModalEnsureMounted(mount);

    // Eager when the user already asked to open feedback; otherwise idle-mount.
    if (typeof window !== 'undefined' && window.mutqinFeedbackPendingOpen) {
        mount();
        return;
    }

    runWhenIdle(() => { mount(); }, 4000);
}

function showBootstrapFailure(error) {
    debugAgentLog('H3', 'app.js:showBootstrapFailure', 'bootstrap failed', {
        name: String(error?.name || ''),
        message: String(error?.message || error || '').slice(0, 400),
        stack: String(error?.stack || '').slice(0, 500),
    });
    reportError(error, { kind: 'bootstrap', feature: 'shell' });
    const mountTarget = document.getElementById('app');
    if (!mountTarget) return;
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
    const title = offline ? resolveEn('common.status.offlineTitle') : resolveEn('common.status.bootErrorTitle');
    const description = offline
        ? resolveEn('common.status.offlineDesc')
        : resolveEn('common.status.bootErrorDesc');
    const retryLabel = resolveEn('common.status.retry');
    const returnHomeLabel = resolveEn('common.status.returnHome');
    mountTarget.innerHTML = `
        <main id="mainContent" tabindex="-1">
            <div class="memorisation-boot-fallback memorisation-boot-fallback-error" role="alert">
                <div class="memorisation-boot-card">
                    <div class="memorisation-boot-card__icon" aria-hidden="true">
                        <i class="bi ${offline ? 'bi-wifi-off' : 'bi-exclamation-triangle'}"></i>
                    </div>
                    <div class="memorisation-boot-card__copy">
                        <strong>${title}</strong>
                        <p>${description}</p>
                    </div>
                    <div class="memorisation-boot-actions">
                        <button type="button" class="memorisation-boot-btn memorisation-boot-btn--primary" id="mutqin-boot-retry">${retryLabel}</button>
                        <a class="memorisation-boot-btn memorisation-boot-btn--secondary" href="/">${returnHomeLabel}</a>
                    </div>
                </div>
            </div>
        </main>
    `;
    mountTarget.querySelector('#mutqin-boot-retry')?.addEventListener('click', () => {
        clearChunkReloadFlag();
        window.location.reload();
    });
    if (offline) {
        window.addEventListener('online', () => window.location.reload(), { once: true });
    }
}

bootstrapApp().catch((error) => {
    debugAgentLog('H4', 'app.js:bootstrapCatch', 'bootstrapApp rejected', {
        name: String(error?.name || ''),
        message: String(error?.message || error || '').slice(0, 400),
    });
    const outcome = recoverFromStaleChunk(error, {
        noticeMessage: resolveEn('common.status.chunkUpdating'),
    });
    debugAgentLog('H4', 'app.js:bootstrapCatch', 'recover outcome', { outcome });
    if (outcome === 'reloading') return;
    showBootstrapFailure(error);
});

initPwa();
