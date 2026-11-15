<template>
  <div class="teacher-learning-plan">
    <TeacherTabGuide kind="page" :title="t('teacher.learning_plan')" :description="t('teacher.plan_page_desc')" />
    <p v-if="error" class="alert alert-danger mb-2" role="alert">{{ error }}</p>
    <p v-if="success" class="alert alert-success mb-2" role="status">{{ success }}</p>

    <div class="teacher-learning-plan__toolbar d-flex flex-wrap align-items-center gap-2 mb-3">
      <button type="button" class="btn btn-primary btn-sm" :disabled="busy" @click="openComposer()">
        <i class="bi bi-plus-lg" aria-hidden="true"></i>
        {{ t('teacher.plan_new') }}
      </button>
      <button type="button" class="btn btn-outline-secondary btn-sm" :disabled="busy" @click="loadSuggestions">
        <i class="bi bi-lightbulb" aria-hidden="true"></i>
        {{ t('teacher.plan_suggest_revisions') }}
      </button>
      <button
        v-if="templates.length"
        type="button"
        class="btn btn-outline-secondary btn-sm"
        :disabled="busy"
        @click="showTemplates = !showTemplates"
      >
        {{ t('teacher.plan_templates') }}
      </button>
    </div>

    <div v-if="showTemplates && templates.length" class="teacher-learning-plan__templates">
      <p class="teacher-learning-plan__templates-label">{{ t('teacher.plan_templates') }}</p>
      <div class="teacher-learning-plan__template-grid">
        <article v-for="tpl in templates" :key="tpl.id" class="teacher-learning-plan__template">
          <strong>{{ tpl.name }}</strong>
          <span>{{ cadenceLabel(tpl.cadence) }}</span>
          <button type="button" class="btn btn-sm btn-outline-primary" :disabled="busy" @click="applyTemplate(tpl)">
            {{ t('teacher.plan_use_template') }}
          </button>
        </article>
      </div>
    </div>

    <p v-if="loading" class="teacher-loading-inline" role="status">{{ t('teacher.loading') }}</p>

    <TeacherEmpty v-else-if="!plans.length" icon="bi bi-calendar-week" :message="t('teacher.plan_empty')" />

    <div v-else class="teacher-learning-plan__board">
      <article
        v-for="(plan, index) in orderedPlans"
        :key="plan.id"
        class="teacher-learning-plan__card"
        :class="[`is-${plan.status}`, { 'is-featured': index === 0 }]"
      >
        <header class="teacher-learning-plan__card-head">
          <div>
            <h3>{{ plan.title }}</h3>
            <p class="teacher-learning-plan__meta">
              <span class="teacher-learning-plan__badge" :class="`is-${plan.status}`">{{ statusLabel(plan.status) }}</span>
              <span>{{ cadenceLabel(plan.cadence) }}</span>
              <span v-if="plan.starts_on">{{ plan.starts_on }}{{ plan.ends_on ? ` → ${plan.ends_on}` : '' }}</span>
            </p>
          </div>
          <p class="teacher-learning-plan__progress-label">{{ t('teacher.plan_progress', { done: plan.progress?.completed || 0, total: plan.progress?.total || 0 }) }}</p>
        </header>
        <div class="teacher-learning-plan__progress-bar" role="progressbar" :aria-valuenow="planPercent(plan)" aria-valuemin="0" aria-valuemax="100">
          <span :style="{ width: `${planPercent(plan)}%` }"></span>
        </div>
        <p v-if="plan.notes" class="teacher-learning-plan__notes">{{ plan.notes }}</p>
        <ol v-if="plan.items?.length" class="teacher-learning-plan__activities">
          <li
            v-for="item in plan.items"
            :key="item.id"
            :class="[`is-${item.display_status}`, item.origin === 'suggested' ? 'is-suggested' : 'is-assigned']"
          >
            <div class="teacher-learning-plan__activity-copy">
              <strong>{{ item.label }}</strong>
              <p class="teacher-learning-plan__meta">
                <span class="teacher-hifz-tag" :class="`is-${item.hifz_category}`">{{ kindLabel(item) }}</span>
                <span class="teacher-learning-plan__badge" :class="`is-${item.display_status}`">{{ displayStatusLabel(item.display_status) }}</span>
                <span v-if="item.due_on">{{ item.due_on }}</span>
              </p>
              <p v-if="item.instructions" class="teacher-learning-plan__instructions">{{ item.instructions }}</p>
            </div>
            <div v-if="item.origin === 'suggested' && item.item_status !== 'released' && item.item_status !== 'skipped'" class="teacher-learning-plan__activity-actions">
              <button type="button" class="btn btn-sm btn-primary" :disabled="busy" @click="approveItem(item)">{{ t('teacher.plan_approve') }}</button>
              <button type="button" class="btn btn-sm btn-outline-secondary" :disabled="busy" @click="skipItem(item)">{{ t('teacher.plan_skip') }}</button>
            </div>
          </li>
        </ol>
        <footer class="teacher-learning-plan__card-actions">
          <button
            v-if="plan.status === 'draft' || plan.status === 'paused'"
            type="button"
            class="btn btn-sm btn-primary"
            :disabled="busy"
            @click="setStatus(plan, 'active')"
          >{{ t('teacher.plan_activate') }}</button>
          <button
            v-if="plan.status === 'active'"
            type="button"
            class="btn btn-sm btn-outline-secondary"
            :disabled="busy"
            @click="setStatus(plan, 'paused')"
          >{{ t('teacher.plan_pause') }}</button>
          <button
            v-if="['active', 'paused'].includes(plan.status)"
            type="button"
            class="btn btn-sm btn-outline-secondary"
            :disabled="busy"
            @click="setStatus(plan, 'completed')"
          >{{ t('teacher.plan_complete') }}</button>
          <button type="button" class="btn btn-sm btn-outline-secondary" :disabled="busy" @click="openComposer(plan)">
            {{ t('teacher.plan_edit') }}
          </button>
          <button type="button" class="btn btn-sm btn-outline-secondary" :disabled="busy" @click="saveAsTemplate(plan)">
            {{ t('teacher.plan_save_template') }}
          </button>
        </footer>
      </article>
    </div>

    <TeacherDialog
      ref="dialog"
      :open="composerOpen"
      :busy="busy"
      :dirty="formDirty"
      :title="editingPlan ? t('teacher.plan_edit') : t('teacher.plan_new')"
      :eyebrow="t('teacher.learning_plan')"
      :close-label="t('teacher.close')"
      @close="closeComposer"
    >
      <template #pills>
        <span class="badge rounded-pill text-bg-light border">{{ form.cadence === 'monthly' ? t('teacher.plan_monthly') : t('teacher.plan_weekly') }}</span>
        <span v-if="form.starts_on" class="badge rounded-pill text-bg-light border">{{ form.starts_on }}</span>
        <span class="badge rounded-pill teacher-pill">{{ t('teacher.plan_activities') }} {{ form.items.length }}</span>
      </template>
      <p v-if="error" class="alert alert-danger" role="alert">{{ error }}</p>
      <div class="teacher-plan-modal__body">
                <div class="teacher-plan-modal__fields">
                  <label class="teacher-plan-modal__field">
                    <span>{{ t('teacher.plan_title') }}</span>
                    <input ref="planTitle" v-model="form.title" class="form-control" type="text" maxlength="160">
                  </label>
                  <label class="teacher-plan-modal__field">
                    <span>{{ t('teacher.plan_cadence') }}</span>
                    <select v-model="form.cadence" class="form-select">
                      <option value="weekly">{{ t('teacher.plan_weekly') }}</option>
                      <option value="monthly">{{ t('teacher.plan_monthly') }}</option>
                    </select>
                  </label>
                  <label class="teacher-plan-modal__field">
                    <span>{{ t('teacher.plan_starts') }}</span>
                    <input v-model="form.starts_on" class="form-control" type="date">
                  </label>
                  <label class="teacher-plan-modal__field teacher-plan-modal__field--wide">
                    <span>{{ t('teacher.plan_notes') }}</span>
                    <textarea v-model="form.notes" class="form-control" rows="2" maxlength="2000"></textarea>
                  </label>
                </div>

                <details v-if="editingPlan?.items?.length" class="teacher-plan-existing">
                  <summary>{{ t('teacher.plan_existing_activities', { n: editingPlan.items.length }) }}</summary>
                  <ul><li v-for="item in editingPlan.items" :key="item.id">{{ item.label }} <span>{{ displayStatusLabel(item.display_status) }}</span></li></ul>
                </details>
                <div class="teacher-plan-modal__activities-head">
                  <strong>{{ t(editingPlan ? 'teacher.plan_additional_activities' : 'teacher.plan_activities') }}</strong>
                  <button type="button" class="btn btn-sm btn-outline-secondary" @click="addDraftItem()">{{ t('teacher.plan_add_activity') }}</button>
                </div>

                <article v-for="(item, index) in form.items" :key="`draft-${index}`" class="teacher-plan-modal__activity">
                  <header>
                    <span>{{ index + 1 }}</span>
                    <button type="button" class="teacher-plan-modal__remove" :aria-label="t('teacher.plan_remove_activity')" @click="form.items.splice(index, 1)">
                      <i class="bi bi-trash" aria-hidden="true"></i>
                    </button>
                  </header>
                  <div class="teacher-plan-modal__activity-grid">
                    <label>
                      <span>{{ t('teacher.plan_kind') }}</span>
                      <select v-model="item.kind" class="form-select form-select-sm">
                        <option value="practice">{{ t('teacher.plan_kind_practice') }}</option>
                        <option value="ai_recite">{{ t('teacher.plan_kind_ai') }}</option>
                        <option value="teacher_review">{{ t('teacher.plan_kind_review') }}</option>
                      </select>
                    </label>
                    <label>
                      <span>{{ t('teacher.surah') }}</span>
                      <TeacherSurahSelect :model-value="item.surah_number" :surahs="teacherSurahs" :disabled="busy" @update:model-value="changeSurah(item, $event)" />
                    </label>
                    <label>
                      <span>{{ t('teacher.from') }}</span>
                      <input v-model.number="item.ayah_start" class="form-control form-control-sm" type="number" min="1" :max="ayahCount(item) || undefined" :aria-invalid="itemError(item) ? 'true' : undefined">
                    </label>
                    <label>
                      <span>{{ t('teacher.to') }}</span>
                      <input v-model.number="item.ayah_end" class="form-control form-control-sm" type="number" min="1" :max="ayahCount(item) || undefined" :aria-invalid="itemError(item) ? 'true' : undefined">
                    </label>
                    <label>
                      <span>{{ t('teacher.due') }}</span>
                      <input v-model="item.due_on" class="form-control form-control-sm" type="date">
                    </label>
                  </div>
                  <p v-if="itemError(item)" class="text-danger small mt-2 mb-0" role="alert">{{ itemError(item) }}</p>
                  <input v-model="item.instructions" class="form-control form-control-sm" type="text" :placeholder="t('teacher.plan_instructions_placeholder')">
                </article>

                <section v-if="suggestions.length" class="teacher-plan-modal__suggestions">
                  <header>
                    <strong>{{ t('teacher.plan_suggestions') }}</strong>
                    <p>{{ t('teacher.plan_suggestions_help') }}</p>
                  </header>
                  <article v-for="(suggestion, index) in suggestions" :key="`sug-${suggestion.weak_spot_id || index}`">
                    <p>{{ suggestion.surah_name }} · {{ suggestion.ayah_start }}<span v-if="suggestion.reason"> — {{ suggestion.reason }}</span></p>
                    <button type="button" class="btn btn-sm btn-outline-primary" @click="addSuggestion(suggestion)">{{ t('teacher.plan_add_suggestion') }}</button>
                  </article>
                </section>
      </div>
      <template #footer>
        <button type="button" class="btn btn-outline-secondary" :disabled="busy" @click="$refs.dialog.requestClose()">{{ t('teacher.cancel') }}</button>
        <button type="button" class="btn" :class="editingPlan ? 'btn-primary' : 'btn-outline-secondary'" :disabled="busy || !formValid" @click="savePlan(false)">{{ t(editingPlan ? 'teacher.task_save' : 'teacher.plan_save_draft') }}</button>
        <button v-if="!editingPlan" type="button" class="btn btn-primary" :disabled="busy || !formValid" @click="savePlan(true)">{{ t('teacher.plan_save_activate') }}</button>
      </template>
    </TeacherDialog>
  </div>
</template>

<script>
import { i18nMixin } from '../../../mixins/i18nMixin'
import { learningApi } from '../../../scripts/api/learning'
import TeacherDialog from '../TeacherDialog.vue'
import TeacherSurahSelect from '../TeacherSurahSelect.vue'
import TeacherEmpty from '../TeacherEmpty.vue'
import TeacherTabGuide from '../TeacherTabGuide.vue'

function blankItem() {
  return {
    kind: 'practice',
    hifz_category: 'sabaq',
    surah_number: 1,
    ayah_start: 1,
    ayah_end: 7,
    due_on: '',
    priority: 'normal',
    instructions: '',
    origin: 'assigned',
  }
}

function blankForm(studentId) {
  return {
    student_id: studentId,
    title: '',
    cadence: 'weekly',
    starts_on: new Date().toISOString().slice(0, 10),
    notes: '',
    items: [blankItem()],
  }
}

export default {
  name: 'TeacherStudentProfilePlan',
  components: { TeacherDialog, TeacherEmpty, TeacherTabGuide, TeacherSurahSelect },
  inject: { teacherSurahs: { default: () => [] } },
  emits: ['updated'],
  mixins: [i18nMixin],
  props: {
    studentId: { type: [Number, String], required: true },
  },
  data() {
    return {
      loading: true,
      busy: false,
      error: '',
      success: '',
      plans: [],
      templates: [],
      suggestions: [],
      showTemplates: false,
      composerOpen: false,
      editingPlan: null,
      form: blankForm(this.studentId),
      initialForm: '',
      requestId: 0,
    }
  },
  computed: {
    formDirty() { return JSON.stringify(this.form) !== this.initialForm },
    formValid() { return Boolean(this.form.title.trim() && this.form.starts_on && (this.editingPlan || this.form.items.length) && this.form.items.every(item => !this.itemError(item))) },
    orderedPlans() {
      const rank = { active: 0, paused: 1, draft: 2, upcoming: 3, completed: 4, archived: 5 }
      return [...this.plans].sort((a, b) => (rank[a.status] ?? 9) - (rank[b.status] ?? 9))
    },
  },
  watch: {
    studentId: {
      immediate: true,
      handler() {
        this.reload()
      },
    },
  },
  methods: {
    ayahCount(item) { return Number(this.teacherSurahs.find(surah => Number(surah.number) === Number(item.surah_number))?.ayah_count || 0) },
    changeSurah(item, number) { item.surah_number = number; item.ayah_start = 1; item.ayah_end = Math.min(this.ayahCount(item) || 1, 7) },
    itemError(item) {
      const from = Number(item.ayah_start), to = Number(item.ayah_end), max = this.ayahCount(item)
      if (!Number.isInteger(from) || from < 1) return this.t('teacher.ayah_range_from_error')
      if (!Number.isInteger(to) || to < 1) return this.t('teacher.ayah_range_to_error')
      if (from > to) return this.t('teacher.ayah_range_order_error')
      if (max && (from > max || to > max)) return this.t('teacher.ayah_range_max_error', { n: max })
      return ''
    },
    async reload() {
      const requestId = ++this.requestId
      this.loading = true
      this.error = ''
      try {
        const [plansRes, templatesRes] = await Promise.all([
          learningApi.getTeacherLearningPlans(this.studentId),
          learningApi.getTeacherLearningPlanTemplates(),
        ])
        if (requestId !== this.requestId) return
        this.plans = Array.isArray(plansRes?.data) ? plansRes.data : []
        this.templates = Array.isArray(templatesRes?.data) ? templatesRes.data : []
      } catch (error) {
        if (requestId !== this.requestId) return
        this.error = error?.response?.data?.message || this.t('teacher.plan_load_error')
      } finally {
        if (requestId === this.requestId) this.loading = false
      }
    },
    openComposer(plan = null) {
      if (this.busy) return
      this.editingPlan = plan
      this.success = ''
      this.error = ''
      if (plan) {
        this.form = {
          student_id: this.studentId,
          title: plan.title || '',
          cadence: plan.cadence || 'weekly',
          starts_on: plan.starts_on || '',
          notes: plan.notes || '',
          items: [],
        }
      } else {
        this.form = blankForm(this.studentId)
        this.form.title = this.t('teacher.plan_default_title')
      }
      this.initialForm = JSON.stringify(this.form)
      this.composerOpen = true
      this.$nextTick(() => this.$refs.planTitle?.focus())
    },
    closeComposer(force = false) {
      if (this.busy && !force) return
      this.composerOpen = false
      this.editingPlan = null
    },
    addDraftItem() {
      this.form.items.push(blankItem())
    },
    addSuggestion(suggestion) {
      if (!this.composerOpen) this.openComposer()
      this.form.items.push({
        ...blankItem(),
        kind: suggestion.kind || 'practice',
        hifz_category: suggestion.hifz_category || 'sabqi',
        surah_number: suggestion.surah_number,
        ayah_start: suggestion.ayah_start,
        ayah_end: suggestion.ayah_end,
        repetition_target: suggestion.repetition_target || 3,
        priority: suggestion.priority || 'high',
        origin: 'suggested',
        weak_spot_id: suggestion.weak_spot_id,
        instructions: suggestion.reason || '',
      })
    },
    async loadSuggestions() {
      this.busy = true
      this.error = ''
      try {
        const data = await learningApi.getTeacherLearningPlanSuggestions(this.studentId)
        this.suggestions = Array.isArray(data?.suggestions) ? data.suggestions : []
        this.busy = false
        if (!this.composerOpen) this.openComposer()
        if (!this.suggestions.length) this.success = this.t('teacher.plan_no_suggestions')
      } catch (error) {
        this.error = error?.response?.data?.message || this.t('teacher.plan_load_error')
      } finally {
        this.busy = false
      }
    },
    async savePlan(activate) {
      if (this.busy || !this.formValid) return
      this.busy = true
      this.error = ''
      this.success = ''
      try {
        if (this.editingPlan) {
          await learningApi.updateTeacherLearningPlan(this.editingPlan.id, {
            title: this.form.title,
            cadence: this.form.cadence,
            starts_on: this.form.starts_on || null,
            notes: this.form.notes,
            items: this.form.items,
          })
          this.success = this.t('teacher.plan_updated')
        } else {
          await learningApi.createTeacherLearningPlan({
            ...this.form,
            activate: Boolean(activate),
          })
          this.success = activate ? this.t('teacher.plan_activated') : this.t('teacher.plan_saved')
        }
        this.closeComposer(true)
        await this.reload()
        this.$emit('updated')
      } catch (error) {
        this.error = error?.response?.data?.message
          || Object.values(error?.response?.data?.errors || {})?.[0]?.[0]
          || this.t('teacher.plan_save_error')
      } finally {
        this.busy = false
      }
    },
    async setStatus(plan, status) {
      this.busy = true
      this.error = ''
      try {
        await learningApi.setTeacherLearningPlanStatus(plan.id, status)
        this.success = this.t('teacher.plan_status_updated')
        await this.reload()
      } catch (error) {
        this.error = error?.response?.data?.message
          || Object.values(error?.response?.data?.errors || {})?.[0]?.[0]
          || this.t('teacher.plan_save_error')
      } finally {
        this.busy = false
      }
    },
    async approveItem(item) {
      this.busy = true
      this.error = ''
      try {
        await learningApi.approveTeacherLearningPlanItem(item.id)
        this.success = this.t('teacher.plan_suggestion_approved')
        await this.reload()
      } catch (error) {
        this.error = error?.response?.data?.message
          || Object.values(error?.response?.data?.errors || {})?.[0]?.[0]
          || this.t('teacher.plan_save_error')
      } finally {
        this.busy = false
      }
    },
    async skipItem(item) {
      this.busy = true
      try {
        await learningApi.skipTeacherLearningPlanItem(item.id)
        await this.reload()
      } catch (error) {
        this.error = error?.response?.data?.message || this.t('teacher.plan_save_error')
      } finally {
        this.busy = false
      }
    },
    async applyTemplate(tpl) {
      this.busy = true
      this.error = ''
      try {
        await learningApi.applyTeacherLearningPlanTemplate(tpl.id, {
          student_id: this.studentId,
          starts_on: new Date().toISOString().slice(0, 10),
        })
        this.success = this.t('teacher.plan_from_template')
        this.showTemplates = false
        await this.reload()
      } catch (error) {
        this.error = error?.response?.data?.message || this.t('teacher.plan_save_error')
      } finally {
        this.busy = false
      }
    },
    async saveAsTemplate(plan) {
      this.busy = true
      this.error = ''
      try {
        await learningApi.createTeacherLearningPlanTemplate({
          name: plan.title,
          cadence: plan.cadence,
          description: plan.notes || '',
          items: (plan.items || [])
            .filter((item) => item.origin !== 'suggested' || item.item_status === 'released')
            .map((item, index) => ({
              kind: item.kind,
              hifz_category: item.hifz_category,
              surah_number: item.surah_number,
              ayah_start: item.ayah_start,
              ayah_end: item.ayah_end,
              repetition_target: item.repetition_target,
              day_offset: index,
              priority: item.priority,
              instructions: item.instructions,
            })),
        })
        this.success = this.t('teacher.plan_template_saved')
        const templatesRes = await learningApi.getTeacherLearningPlanTemplates()
        this.templates = Array.isArray(templatesRes?.data) ? templatesRes.data : []
      } catch (error) {
        this.error = error?.response?.data?.message || this.t('teacher.plan_save_error')
      } finally {
        this.busy = false
      }
    },
    planPercent(plan) {
      const total = Number(plan.progress?.total || 0)
      const done = Number(plan.progress?.completed || 0)
      if (!total) return 0
      return Math.min(100, Math.round((done / total) * 100))
    },
    cadenceLabel(value) {
      return value === 'monthly' ? this.t('teacher.plan_monthly') : this.t('teacher.plan_weekly')
    },
    statusLabel(value) {
      const key = {
        draft: 'teacher.plan_status_draft',
        active: 'teacher.plan_status_active',
        paused: 'teacher.plan_status_paused',
        completed: 'teacher.plan_status_completed',
        archived: 'teacher.plan_status_archived',
      }[value]
      return key ? this.t(key) : value
    },
    displayStatusLabel(value) {
      const key = {
        overdue: 'teacher.overdue',
        upcoming: 'teacher.plan_status_upcoming',
        completed: 'teacher.task_filter_completed',
        paused: 'teacher.plan_status_paused',
        planned: 'teacher.plan_status_planned',
        in_progress: 'teacher.task_filter_progress',
        skipped: 'teacher.plan_status_skipped',
      }[value]
      return key ? this.t(key) : value
    },
    kindLabel(item) {
      if (item.kind === 'ai_recite') return this.t('teacher.plan_kind_ai')
      if (item.hifz_category === 'manzil') return this.t('teacher.plan_kind_review')
      return this.t('teacher.plan_kind_practice')
    },
  },
}
</script>
