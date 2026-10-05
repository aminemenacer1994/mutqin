import { isBrowserOffline } from '../utils/networkStatus'
import { clearChunkReloadFlag } from '../utils/chunkLoadRecovery'

/**
 * Recoverable async-page / lazy-chunk failure. Used by lazyPage() and
 * memorisation workspace chunks after the one-shot deploy reload has given up.
 */
export default {
    name: 'PageLoadError',
    props: { error: { type: Object, default: null } },
    data() {
        return {
            offline: isBrowserOffline(),
            onlineHandler: null,
        }
    },
    computed: {
        title() {
            return this.offline
                ? this.t('common.status.offlineTitle')
                : this.t('common.status.chunkErrorTitle')
        },
        description() {
            return this.offline
                ? this.t('common.status.offlineDesc')
                : this.t('common.status.chunkErrorDesc')
        },
        retryLabel() {
            return this.offline
                ? this.t('common.status.retry')
                : this.t('common.status.refresh')
        },
        returnHomeLabel() {
            return this.t('common.status.returnHome')
        },
    },
    mounted() {
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
