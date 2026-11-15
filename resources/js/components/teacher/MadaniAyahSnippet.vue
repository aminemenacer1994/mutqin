<template>
  <QuranAyahDisplay
    :words="words"
    :loading="loading"
    :inline="inline"
    :focus-index="focusIndex"
    :empty-label="failed ? t('teacher.madani_text_unavailable') : ''"
  />
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import { loadTeacherMadaniAyah } from '../../scripts/teacher/madaniDisplayWords'
import QuranAyahDisplay from './QuranAyahDisplay.vue'

export default {
  name: 'MadaniAyahSnippet',
  components: { QuranAyahDisplay },
  mixins: [i18nMixin],
  props: {
    surah: { type: [Number, String], required: true },
    ayah: { type: [Number, String], required: true },
    inline: { type: Boolean, default: true },
    focusIndex: { type: Number, default: null },
  },
  data() {
    return {
      words: [],
      loading: true,
      failed: false,
      requestId: 0,
    }
  },
  watch: {
    surah: { immediate: true, handler() { this.load() } },
    ayah() { this.load() },
  },
  methods: {
    async load() {
      const request = ++this.requestId
      const surah = Number(this.surah)
      const ayah = Number(this.ayah)
      if (!Number.isInteger(surah) || surah < 1 || !Number.isInteger(ayah) || ayah < 1) {
        this.words = []
        this.failed = true
        this.loading = false
        return
      }
      this.loading = true
      this.failed = false
      this.words = []
      try {
        const words = await loadTeacherMadaniAyah(surah, ayah)
        if (request !== this.requestId) return
        this.words = words
        this.failed = words.length === 0
      } catch {
        if (request !== this.requestId) return
        this.words = []
        this.failed = true
      } finally {
        if (request === this.requestId) this.loading = false
      }
    },
  },
}
</script>
