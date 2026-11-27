<template>
  <div class="hifz-examination workspace-shell" data-examination-ui="v1">
    <header class="hifz-examination__header">
      <p class="hifz-examination__badge">{{ t('teacher.activity_hifz_examination') }}</p>
      <h1 class="hifz-examination__title">{{ t('memorisation.examination.heading') }}</h1>
      <p v-if="error" class="alert alert-danger" role="alert">{{ error }}</p>
      <p v-else-if="loading" class="text-body-secondary">{{ t('memorisation.examination.loading') }}</p>
    </header>

    <section v-if="examination && !loading" class="hifz-examination__body">
      <p class="text-body-secondary small">{{ t('memorisation.examination.progress', { done: examination.completed_question_count, total: examination.question_count }) }}</p>
      <article v-for="question in examination.questions" :key="question.id" class="hifz-examination__question card mb-3">
        <header class="card-header d-flex justify-content-between align-items-center">
          <strong>{{ t('memorisation.examination.question', { n: question.position }) }}</strong>
          <span class="badge text-bg-secondary">{{ t(`teacher.examination_mode_${question.mode}`) }}</span>
        </header>
        <div class="card-body">
          <p class="mb-2">{{ t('memorisation.examination.passage', { surah: question.surah, from: question.ayah, to: question.end_ayah }) }}</p>
          <p v-if="question.answered_at" class="text-success small mb-0">{{ t('memorisation.examination.answered') }}</p>
          <button
            v-else
            type="button"
            class="btn btn-primary btn-sm"
            :disabled="saving"
            @click="markAnswered(question)"
          >
            {{ t('memorisation.examination.mark_done') }}
          </button>
        </div>
      </article>
      <div class="hifz-examination__footer d-flex gap-2">
        <a v-if="dashboardUrl" class="btn btn-outline-secondary" :href="dashboardUrl">{{ t('memorisation.examination.back') }}</a>
        <button type="button" class="btn btn-primary" :disabled="saving || !canSubmit" @click="submitExamination">
          {{ t('memorisation.examination.submit') }}
        </button>
      </div>
    </section>
  </div>
</template>

<script>
import { i18nMixin } from '../mixins/i18nMixin'

export default {
  name: 'HifzExamination',
  mixins: [i18nMixin],
  props: {
    auth: { type: Object, default: () => ({}) },
  },
  data() {
    return {
      loading: true,
      saving: false,
      error: '',
      examination: null,
      recipientId: null,
    }
  },
  computed: {
    dashboardUrl() {
      return this.auth?.dashboard_url || '/dashboard'
    },
    canSubmit() {
      if (!this.examination) return false
      return Number(this.examination.completed_question_count) >= Number(this.examination.question_count)
    },
  },
  mounted() {
    const params = new URLSearchParams(window.location.search)
    this.recipientId = params.get('assignment_recipient')
    if (!this.recipientId) {
      this.error = this.t('memorisation.examination.missing_recipient')
      this.loading = false
      return
    }
    this.loadExamination()
  },
  methods: {
    async loadExamination() {
      this.loading = true
      this.error = ''
      try {
        const response = await window.axios.get(`/api/me/assignments/${this.recipientId}/examination`)
        this.examination = response.data?.examination || null
      } catch (err) {
        this.error = err?.response?.data?.message || this.t('memorisation.examination.load_error')
      } finally {
        this.loading = false
      }
    },
    async markAnswered(question) {
      this.saving = true
      try {
        const response = await window.axios.post(`/api/me/examination/questions/${question.id}/answer`, {
          completed: true,
          fluency: 'sound',
        })
        const updated = response.data?.question
        if (updated && this.examination?.questions) {
          this.examination.questions = this.examination.questions.map((row) => (row.id === updated.id ? updated : row))
          this.examination.completed_question_count = this.examination.questions.filter((row) => row.answered_at).length
        }
      } catch (err) {
        this.error = err?.response?.data?.message || this.t('memorisation.examination.save_error')
      } finally {
        this.saving = false
      }
    },
    async submitExamination() {
      this.saving = true
      try {
        const response = await window.axios.post(`/api/me/assignments/${this.recipientId}/examination/submit`)
        this.examination = response.data?.examination || this.examination
      } catch (err) {
        this.error = err?.response?.data?.message || this.t('memorisation.examination.submit_error')
      } finally {
        this.saving = false
      }
    },
  },
}
</script>