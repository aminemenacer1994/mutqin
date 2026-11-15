<template>
  <section v-if="error || items.length" class="teacher-difficulties teacher-learn__spots" :aria-label="t('teacher.difficulties_title')">
    <h3>{{ t('teacher.difficulties_title') }}</h3>
    <p v-if="error" class="alert alert-danger py-2" role="alert">{{ error }}</p>

    <ul v-else class="teacher-spot-list">
      <li v-for="item in items" :key="item.id">
        <div class="teacher-spot-list__copy">
          <strong>{{ item.ayah_label }}</strong>
          <MadaniAyahSnippet
            v-if="item.surah_number && item.ayah_number"
            class="teacher-difficulties__arabic"
            :surah="item.surah_number"
            :ayah="item.ayah_number"
          />
          <span>{{ t('teacher.times', { n: item.occurrence_count || item.affected_attempt_count || 0 }) }}</span>
        </div>
        <button type="button" class="btn btn-sm btn-primary" @click="$emit('assign-revision', assignPayload(item))">{{ t('teacher.assign_revision') }}</button>
      </li>
    </ul>
  </section>
</template>

<script>
import { i18nMixin } from '../../../mixins/i18nMixin'
import { learningApi } from '../../../scripts/api/learning'
import MadaniAyahSnippet from '../MadaniAyahSnippet.vue'

export default {
  name: 'TeacherRecitationDifficultiesPanel',
  components: { MadaniAyahSnippet },
  mixins: [i18nMixin],
  props: {
    studentId: { type: [Number, String], required: true },
    formatWhen: { type: Function, required: true },
    initialSummary: { type: Object, default: null },
    initialItems: { type: Array, default: null },
    memorisationBase: { type: String, default: '/memorisation' },
  },
  emits: ['assign-revision'],
  data() {
    return {
      loading: false,
      detailLoading: false,
      error: '',
      items: Array.isArray(this.initialItems) ? this.initialItems : [],
      summary: this.initialSummary,
      expandedId: null,
      detail: null,
      busyId: 0,
    }
  },
  watch: {
    studentId: {
      immediate: true,
      handler() {
        if (!this.initialItems) this.reload()
      },
    },
    initialItems(value) {
      if (Array.isArray(value)) this.items = value
    },
    initialSummary(value) {
      if (value) this.summary = value
    },
  },
  methods: {
    async reload() {
      this.loading = true
      this.error = ''
      try {
        const data = await learningApi.getTeacherStudentRecitationDifficulties(this.studentId, {
          state: 'recurring',
          per_page: 12,
        })
        this.items = Array.isArray(data?.data) ? data.data : []
        this.summary = data?.summary || null
      } catch (error) {
        this.error = error?.response?.data?.message || this.t('teacher.difficulties_load_error')
      } finally {
        this.loading = false
      }
    },
    async toggle(id) {
      if (this.expandedId === id) {
        this.expandedId = null
        this.detail = null
        return
      }
      this.expandedId = id
      this.detail = null
      this.detailLoading = true
      try {
        const data = await learningApi.getTeacherStudentRecitationDifficulty(this.studentId, id)
        this.detail = data?.difficulty || null
      } catch (error) {
        this.error = error?.response?.data?.message || this.t('teacher.difficulties_load_error')
      } finally {
        this.detailLoading = false
      }
    },
    async review(item, status) {
      this.busyId = item.id
      this.error = ''
      try {
        const data = await learningApi.reviewTeacherStudentRecitationDifficulty(this.studentId, item.id, { status })
        const updated = data?.difficulty
        if (updated) {
          this.items = this.items.map((row) => (row.id === item.id ? { ...row, ...updated } : row))
          this.detail = updated
        }
        await this.reload()
      } catch (error) {
        this.error = error?.response?.data?.message || this.t('teacher.difficulties_save_error')
      } finally {
        this.busyId = 0
      }
    },
    assignPayload(item) {
      return {
        id: this.studentId,
        task_kind: 'practice',
        hifz_category: 'sabqi',
        weak_example: {
          surah_number: item.surah_number,
          ayah_number: item.ayah_number,
          ayah_start: item.ayah_number,
          ayah_end: item.ayah_number,
        },
        weak_spot_id: item.id,
      }
    },
    practiseHref(item) {
      const params = item?.practise_again?.href_params
      if (!params) return ''
      const search = new URLSearchParams()
      Object.entries(params).forEach(([key, value]) => {
        if (value == null || value === '') return
        search.set(key, String(value))
      })
      return `${String(this.memorisationBase || '/memorisation').split('?')[0]}?${search.toString()}`
    },
    stateLabel(state) {
      const key = {
        recurring: 'teacher.difficulty_state_recurring',
        improving: 'teacher.difficulty_state_improving',
        resolved: 'teacher.difficulty_state_resolved',
        insufficient_data: 'teacher.difficulty_state_insufficient',
      }[state]
      return key ? this.t(key) : state
    },
    trendLabel(label) {
      const key = {
        improving: 'teacher.difficulty_state_improving',
        regressing: 'teacher.difficulty_trend_regressing',
        stable: 'teacher.difficulty_trend_stable',
        resolved: 'teacher.difficulty_state_resolved',
        insufficient_data: 'teacher.difficulty_state_insufficient',
      }[label]
      return key ? this.t(key) : label
    },
    mistakeLabel(kind) {
      const key = {
        substitution: 'teacher.difficulty_kind_substitution',
        omission: 'teacher.difficulty_kind_omission',
        pronunciation: 'teacher.difficulty_kind_pronunciation',
        insertion: 'teacher.difficulty_kind_insertion',
        skipped: 'teacher.difficulty_kind_skipped',
      }[kind]
      return key ? this.t(key) : this.t('teacher.difficulty_kind_unknown')
    },
  },
}
</script>
