/**
 * Shared i18n helper for Options API components.
 */
export const i18nMixin = {
  methods: {
    t(key, params = {}) {
      const translator = this.$t
      if (typeof translator !== 'function') return key
      return translator(key, params)
    },
  },
  mounted() {
    this._i18nLocaleHandler = (event) => {
      this.$forceUpdate?.()
      if (typeof this.onLocaleChange === 'function') {
        this.onLocaleChange(event?.detail?.locale)
      }
    }
    window.addEventListener('mutqin:locale-change', this._i18nLocaleHandler)
  },
  beforeUnmount() {
    if (this._i18nLocaleHandler) {
      window.removeEventListener('mutqin:locale-change', this._i18nLocaleHandler)
    }
  },
}
