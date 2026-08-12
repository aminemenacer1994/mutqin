<template>
  <div
    v-if="visible"
    class="modal-overlay mutqin-modal-overlay ayah-tafsir-modal-overlay"
    @click.self="close"
  >
    <div class="modal-dialog modal-dialog-centered mutqin-modal-dialog ayah-tafsir-dialog">
      <div
        class="modal-content mutqin-modal-surface ayah-tafsir-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ayahTafsirModalTitle"
      >
        <div class="modal-header ayah-tafsir-header">
          <div class="ayah-tafsir-header-text">
            <div class="ayah-tafsir-header-row">
              <h2 id="ayahTafsirModalTitle">{{ t('memorisation.tafsir.title') }}</h2>
            </div>
            <p class="ayah-tafsir-context">{{ contextBadge }}</p>
          </div>
          <button
            type="button"
            class="modal-close-btn"
            :aria-label="t('common.close')"
            @click="close"
          >
            <i class="bi bi-x-lg" aria-hidden="true"></i>
          </button>
        </div>

        <div class="modal-body ayah-tafsir-modal-body">
          <section class="ayah-tafsir-ayah-block" dir="rtl" lang="ar">
            <h3 class="ayah-tafsir-section-label">{{ t('memorisation.tafsir.ayahLabel') }}</h3>
            <p class="ayah-tafsir-ayah-text">{{ displayArabic }}</p>
          </section>

          <section class="ayah-tafsir-content-section">
            <AppStatus
              v-if="loading"
              variant="loading"
              size="sm"
              compact
              :title="t('memorisation.tafsir.loading')"
            />

            <AppStatus
              v-else-if="loadError"
              variant="error"
              size="sm"
              :title="t('common.status.errorTitle')"
              :description="t('memorisation.tafsir.loadFailed')"
              :action-label="t('common.retry')"
              @action="loadTafsir"
            />

            <AppStatus
              v-else-if="!available"
              variant="empty"
              size="sm"
              icon="bi-journal-bookmark"
              :title="t('memorisation.tafsir.unavailableTitle')"
              :description="t('memorisation.tafsir.unavailable')"
            />

            <template v-else-if="tafsir">
              <div
                class="ayah-tafsir-text-scroll"
                :dir="textDirection"
                :lang="tafsir.language || 'en'"
              >
                <p
                  v-for="(paragraph, index) in tafsirParagraphs"
                  :key="index"
                  class="ayah-tafsir-paragraph"
                >{{ paragraph }}</p>
              </div>
              <p
                v-if="tafsirSource"
                class="ayah-tafsir-source"
                :dir="textDirection"
                :lang="tafsir.language || 'en'"
              >— {{ tafsirSource }}</p>
            </template>
          </section>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import tafsirApi from '../scripts/api/tafsir'
import AppStatus from './AppStatus.vue'

export default {
  name: 'AyahTafsirModal',
  components: { AppStatus },
  props: {
    visible: { type: Boolean, default: false },
    surahNumber: { type: Number, default: 0 },
    ayahNumber: { type: Number, default: 0 },
    surahName: { type: String, default: '' },
    arabicText: { type: String, default: '' },
    resourceId: { type: String, default: '' },
  },
  emits: ['close'],
  data() {
    return {
      loading: false,
      loadError: false,
      available: false,
      tafsir: null,
      lastFetchKey: '',
    }
  },
  computed: {
    contextBadge() {
      const surah = this.surahName || this.t('memorisation.tafsir.surahFallback', { number: this.surahNumber })
      return this.t('memorisation.tafsir.contextBadge', {
        surah,
        ayah: this.ayahNumber,
      })
    },
    displayArabic() {
      return String(this.arabicText || '').trim()
    },
    textDirection() {
      const lang = String(this.tafsir?.language || 'en').toLowerCase()
      if (lang.startsWith('ar') || lang.startsWith('ur') || lang.startsWith('fa')) return 'rtl'
      return 'ltr'
    },
    tafsirParagraphs() {
      const raw = String(this.tafsir?.tafsir_text || '').trim()
      if (!raw) return []
      if (raw.includes('\n\n')) {
        return raw.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean)
      }
      return [raw]
    },
    tafsirSource() {
      return String(this.tafsir?.tafsir_source || '').trim()
    },
    fetchKey() {
      if (!this.surahNumber || !this.ayahNumber) return ''
      return `${this.resourceId || 'default'}:${this.surahNumber}:${this.ayahNumber}`
    },
  },
  watch: {
    visible(next) {
      if (next) {
        this.loadTafsir()
      } else {
        this.resetState()
      }
    },
    fetchKey(next, prev) {
      if (this.visible && next && next !== prev) {
        this.loadTafsir()
      }
    },
  },
  methods: {
    t(key, params) {
      return this.$t ? this.$t(key, params) : key
    },
    close() {
      this.$emit('close')
    },
    resetState() {
      this.loading = false
      this.loadError = false
      this.available = false
      this.tafsir = null
      this.lastFetchKey = ''
    },
    async loadTafsir() {
      if (!this.surahNumber || !this.ayahNumber) {
        this.available = false
        this.tafsir = null
        return
      }

      const key = this.fetchKey
      if (key === this.lastFetchKey && this.tafsir && !this.loadError) {
        return
      }

      this.loading = true
      this.loadError = false
      this.available = false
      this.tafsir = null

      try {
        const payload = await tafsirApi.getAyahTafsir({
          surah_number: this.surahNumber,
          ayah_number: this.ayahNumber,
          resource_id: this.resourceId || undefined,
        })

        this.lastFetchKey = key
        this.available = !!payload?.available && !!payload?.tafsir?.tafsir_text
        this.tafsir = this.available ? payload.tafsir : null
      } catch (error) {
        console.error('Failed to load tafsir', error)
        this.loadError = true
        this.available = false
        this.tafsir = null
      } finally {
        this.loading = false
      }
    },
  },
}
</script>
