import { isBrowserOffline } from '../utils/networkStatus'
import { clearChunkReloadFlag } from '../utils/chunkLoadRecovery'
import { classifyAsyncLoadError, logAsyncLoadError } from '../utils/asyncLoadError'

/**
 * Recoverable async-page / lazy-chunk failure. Used by lazyPage() and
 * memorisation workspace chunks after the one-shot deploy reload has given up.
 */
export default {
    name: 'PageLoadError',
    props: {
        error: { type: Object, default: null },
        feature: { type: String, default: 'page' },
    },
    data() {
        return {
            offline: isBrowserOffline(),
            onlineHandler: null,
        }
    },
    computed: {
        loadKind() {
            return classifyAsyncLoadError(this.error)
        },
        isChunkError() {
            return this.loadKind === 'chunk'
        },
        resolvedFeature() {
            return this.error?.mutqinFeature || this.feature || 'page'
        },
        title() {
            if (this.offline) return this.t('common.status.offlineTitle')
            if (this.isChunkError) return this.t('common.status.chunkErrorTitle')
            return this.t('common.status.bootErrorTitle')
        },
        description() {
            if (this.offline) return this.t('common.status.offlineDesc')
            if (this.isChunkError) return this.t('common.status.chunkErrorDesc')
            return this.t('common.status.bootErrorDesc')
        },
        retryLabel() {
            if (this.offline) return this.t('common.status.retry')
            if (this.isChunkError) return this.t('common.status.refresh')
            return this.t('common.status.retry')
        },
        returnHomeLabel() {
            return this.t('common.status.returnHome')
        },
    },
    mounted() {
        if (!this.isChunkError) {
            logAsyncLoadError(this.error, this.resolvedFeature)
        }
        this.onlineHandler = () => {
            const wasOffline = this.offline
            this.offline = isBrowserOffline()
            if (wasOffline && !this.offline) this.reload()
        }
        window.addEventListener('online', this.onlineHandler)
        window.addEventListener('offline', this.onlineHandler)
    },
    beforeUnmount() {
        if (this.onlineHandler) {
            window.removeEventListener('online', this.onlineHandler)
            window.removeEventListener('offline', this.onlineHandler)
        }
    },
    template: `
        <div class="memorisation-boot-fallback memorisation-boot-fallback-error" role="alert">
            <div class="memorisation-boot-card">
                <div class="memorisation-boot-card__icon" aria-hidden="true">
                    <i class="bi" :class="offline ? 'bi-wifi-off' : 'bi-exclamation-triangle'"></i>
                </div>
                <div class="memorisation-boot-card__copy">
                    <strong>{{ title }}</strong>
                    <p>{{ description }}</p>
                </div>
                <div class="memorisation-boot-actions">
                    <button type="button" class="memorisation-boot-btn memorisation-boot-btn--primary" @click="reload">{{ retryLabel }}</button>
                    <a class="memorisation-boot-btn memorisation-boot-btn--secondary" href="/">{{ returnHomeLabel }}</a>
                </div>
            </div>
        </div>
    `,
    methods: {
        reload() {
            clearChunkReloadFlag()
            window.location.reload()
        },
    },
}
