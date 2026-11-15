<template>
  <TeacherSectionPane tone="neutral" flat>
    <section
      class="teacher-private-notes"
      :class="{ 'is-preview': variant === 'preview' }"
      :aria-label="t('teacher.private_notes_title')"
    >
      <header class="teacher-private-notes__head">
        <span class="teacher-private-notes__mark" aria-hidden="true"><i class="bi bi-journal-lock"></i></span>
        <div class="teacher-private-notes__head-copy">
          <h3>{{ t('teacher.private_notes_title') }}</h3>
          <p>{{ t('teacher.private_notes_hint') }}</p>
        </div>
        <button type="button" class="btn btn-primary btn-sm" @click="startCreate">
          <i class="bi bi-plus-lg" aria-hidden="true"></i>
          <span>{{ t('teacher.private_notes_add') }}</span>
        </button>
      </header>

      <div v-if="variant !== 'preview'" class="teacher-private-notes__toolbar" role="search">
        <label class="visually-hidden" for="teacher-private-notes-search">{{ t('teacher.private_notes_search') }}</label>
        <span class="teacher-private-notes__search">
          <i class="bi bi-search" aria-hidden="true"></i>
          <input
            id="teacher-private-notes-search"
            v-model="search"
            type="search"
            class="form-control form-control-sm"
            :placeholder="t('teacher.private_notes_search')"
            autocomplete="off"
            @input="onSearchInput"
          >
        </span>
      </div>

      <div
        v-if="variant !== 'preview'"
        class="teacher-private-notes__filters"
        role="toolbar"
        :aria-label="t('teacher.private_notes_category')"
      >
        <button
          type="button"
          class="teacher-private-notes__chip"
          :class="{ 'is-active': !category }"
          :aria-pressed="!category ? 'true' : 'false'"
          @click="setCategory('')"
        >
          {{ t('teacher.private_notes_all_categories') }}
        </button>
        <button
          v-for="item in categories"
          :key="item"
          type="button"
          class="teacher-private-notes__chip"
          :class="[`is-${item}`, { 'is-active': category === item }]"
          :aria-pressed="category === item ? 'true' : 'false'"
          @click="setCategory(item)"
        >
          <i :class="categoryIcon(item)" aria-hidden="true"></i>
          {{ categoryLabel(item) }}
        </button>
        <button
          type="button"
          class="teacher-private-notes__chip teacher-private-notes__chip--quiet"
          :class="{ 'is-active': showArchived }"
          :aria-pressed="showArchived ? 'true' : 'false'"
          @click="toggleArchived"
        >
          <i class="bi bi-archive" aria-hidden="true"></i>
          {{ t('teacher.private_notes_show_archived') }}
        </button>
      </div>

      <form v-if="editorOpen && variant !== 'preview'" class="teacher-private-notes__editor" @submit.prevent="save">
        <div class="teacher-private-notes__editor-top">
          <div class="teacher-private-notes__choices" role="radiogroup" :aria-label="t('teacher.private_notes_category')">
            <button
              v-for="item in categories"
              :key="item"
              type="button"
              class="teacher-private-notes__choice"
              :class="[`is-${item}`, { 'is-active': draft.category === item }]"
              role="radio"
              :aria-checked="draft.category === item ? 'true' : 'false'"
              @click="draft.category = item"
            >
              <i :class="categoryIcon(item)" aria-hidden="true"></i>
              {{ categoryLabel(item) }}
            </button>
          </div>
          <button
            type="button"
            class="teacher-private-notes__pin"
            :class="{ 'is-on': draft.pinned }"
            :aria-pressed="draft.pinned ? 'true' : 'false'"
            @click="draft.pinned = !draft.pinned"
          >
            <i class="bi" :class="draft.pinned ? 'bi-pin-angle-fill' : 'bi-pin-angle'" aria-hidden="true"></i>
            {{ t('teacher.private_notes_pin') }}
          </button>
        </div>

        <label class="visually-hidden" for="teacher-private-note-body">{{ t('teacher.private_notes_body') }}</label>
        <textarea
          id="teacher-private-note-body"
          ref="body"
          v-model="draft.body"
          class="form-control"
          rows="4"
          maxlength="4000"
          required
          dir="auto"
          :placeholder="t('teacher.private_notes_body_placeholder')"
        ></textarea>
        <span class="teacher-private-notes__count">{{ draft.body.length }}/4000</span>

        <details class="teacher-private-notes__links">
          <summary>{{ t('teacher.private_notes_optional_links') }}</summary>
          <div class="teacher-private-notes__links-grid">
            <div>
              <label class="form-label" for="teacher-private-note-surah">{{ t('teacher.surah') }}</label>
              <input id="teacher-private-note-surah" v-model.number="draft.surah_number" class="form-control form-control-sm" type="number" min="1" max="114">
            </div>
            <div>
              <label class="form-label" for="teacher-private-note-from">{{ t('teacher.from') }}</label>
              <input id="teacher-private-note-from" v-model.number="draft.ayah_start" class="form-control form-control-sm" type="number" min="1">
            </div>
            <div>
              <label class="form-label" for="teacher-private-note-to">{{ t('teacher.to') }}</label>
              <input id="teacher-private-note-to" v-model.number="draft.ayah_end" class="form-control form-control-sm" type="number" min="1">
            </div>
            <div>
              <label class="form-label" for="teacher-private-note-assignment">{{ t('teacher.private_notes_assignment') }}</label>
              <select id="teacher-private-note-assignment" v-model="draft.teacher_assignment_id" class="form-select form-select-sm">
                <option value="">{{ t('teacher.private_notes_no_assignment') }}</option>
                <option v-for="task in assignmentOptions" :key="task.id" :value="String(task.id)">{{ task.label }}</option>
              </select>
            </div>
          </div>
        </details>

        <div class="teacher-private-notes__editor-foot">
          <div class="teacher-private-notes__editor-actions">
            <button type="button" class="btn btn-outline-secondary btn-sm" :disabled="saving" @click="closeEditor">{{ t('teacher.cancel') }}</button>
            <button type="submit" class="btn btn-primary btn-sm" :disabled="saving || !canSave">
              {{ editingId ? t('teacher.private_notes_save') : t('teacher.private_notes_create') }}
            </button>
          </div>
        </div>
      </form>

      <p v-if="error" class="teacher-private-notes__status is-error" role="alert">{{ error }}</p>
      <p v-else-if="success" class="teacher-private-notes__status is-success" role="status">{{ success }}</p>

      <p v-if="loading" class="teacher-private-notes__empty" role="status">{{ t('teacher.loading') }}</p>
      <div v-else-if="!notes.length" class="teacher-private-notes__empty-card">
        <span aria-hidden="true"><i class="bi bi-journal-plus"></i></span>
        <p>{{ showArchived ? t('teacher.private_notes_archived_empty') : t('teacher.private_notes_empty') }}</p>
      </div>
      <div v-else class="teacher-private-notes__list">
        <article
          v-for="note in visibleNotes"
          :key="note.id"
          class="teacher-private-notes__card"
          :class="[`is-${note.category}`, { 'is-pinned': note.pinned, 'is-archived': note.archived, 'is-busy': busyId === note.id }]"
        >
          <header class="teacher-private-notes__card-head">
            <div class="teacher-private-notes__card-meta">
              <span class="teacher-private-notes__category">
                <i :class="categoryIcon(note.category)" aria-hidden="true"></i>
                {{ categoryLabel(note.category) }}
              </span>
              <span v-if="note.pinned" class="teacher-private-notes__badge"><i class="bi bi-pin-angle-fill" aria-hidden="true"></i>{{ t('teacher.private_notes_pinned') }}</span>
              <span v-if="note.shared" class="teacher-private-notes__badge is-shared">{{ t('teacher.private_notes_shared') }}</span>
              <span v-if="note.archived" class="teacher-private-notes__badge">{{ t('teacher.private_notes_archived') }}</span>
            </div>
            <div class="teacher-private-notes__card-dates">
              <time :datetime="note.updated_at || note.created_at">{{ formatWhen(note.updated_at || note.created_at) }}</time>
              <small v-if="note.updated_at && note.updated_at !== note.created_at">{{ t('teacher.private_notes_edited') }}</small>
            </div>
          </header>
          <p class="teacher-private-notes__body" dir="auto">{{ note.body }}</p>
          <p v-if="note.passage || note.assignment" class="teacher-private-notes__links-line">
            <span v-if="note.passage"><i class="bi bi-bookmark" aria-hidden="true"></i>{{ note.passage.surah_name }} · {{ note.passage.ayah_start }}–{{ note.passage.ayah_end }}</span>
            <span v-if="note.assignment"><i class="bi bi-journal-check" aria-hidden="true"></i>{{ note.assignment.label }}</span>
          </p>
          <div v-if="variant !== 'preview'" class="teacher-private-notes__card-actions">
            <button type="button" class="teacher-private-notes__icon" :disabled="busyId === note.id" :aria-label="note.pinned ? t('teacher.private_notes_unpin') : t('teacher.private_notes_pin')" :title="note.pinned ? t('teacher.private_notes_unpin') : t('teacher.private_notes_pin')" @click="togglePin(note)">
              <i class="bi" :class="note.pinned ? 'bi-pin-angle-fill' : 'bi-pin-angle'" aria-hidden="true"></i>
            </button>
            <button type="button" class="teacher-private-notes__icon" :disabled="busyId === note.id" :aria-label="t('teacher.private_notes_edit')" :title="t('teacher.private_notes_edit')" @click="startEdit(note)">
              <i class="bi bi-pencil" aria-hidden="true"></i>
            </button>
            <button
              v-if="!note.archived"
              type="button"
              class="teacher-private-notes__icon"
              :disabled="busyId === note.id"
              :aria-label="t('teacher.private_notes_share')"
              :title="t('teacher.private_notes_share')"
              @click="shareNote(note)"
            >
              <i class="bi bi-share" aria-hidden="true"></i>
            </button>
            <button type="button" class="teacher-private-notes__icon" :disabled="busyId === note.id" :aria-label="note.archived ? t('teacher.private_notes_unarchive') : t('teacher.private_notes_archive')" :title="note.archived ? t('teacher.private_notes_unarchive') : t('teacher.private_notes_archive')" @click="toggleArchive(note)">
              <i class="bi" :class="note.archived ? 'bi-arrow-counterclockwise' : 'bi-archive'" aria-hidden="true"></i>
            </button>
            <button type="button" class="teacher-private-notes__icon is-danger" :disabled="busyId === note.id" :aria-label="t('teacher.private_notes_delete')" :title="t('teacher.private_notes_delete')" @click="removeNote(note)">
              <i class="bi bi-trash3" aria-hidden="true"></i>
            </button>
          </div>
        </article>
        <button
          v-if="variant === 'preview'"
          type="button"
          class="btn btn-outline-secondary btn-sm teacher-private-notes__open"
          @click="$emit('open-section', 'notes')"
        >
          {{ t('teacher.open') }} {{ t('teacher.tab_notes') }}
          <span v-if="notes.length > visibleNotes.length" class="teacher-private-notes__open-count">{{ notes.length }}</span>
        </button>
      </div>
    </section>
  </TeacherSectionPane>
</template>

<script>
import { i18nMixin } from '../../../mixins/i18nMixin'
import { learningApi } from '../../../scripts/api/learning'
import TeacherSectionPane from '../TeacherSectionPane.vue'

const CATEGORIES = [
  'strengths',
  'difficulties',
  'learning_needs',
  'lesson_observations',
  'recommendations',
]

function blankDraft() {
  return {
    category: 'lesson_observations',
    body: '',
    pinned: false,
    surah_number: '',
    ayah_start: '',
    ayah_end: '',
    teacher_assignment_id: '',
  }
}

export default {
  name: 'TeacherStudentProfileNotes',
  components: { TeacherSectionPane },
  mixins: [i18nMixin],
  props: {
    profile: { type: Object, required: true },
    formatWhen: { type: Function, required: true },
    variant: { type: String, default: 'full' },
  },
  emits: ['open-section'],
  data() {
    return {
      notes: [],
      categories: CATEGORIES,
      search: '',
      category: '',
      showArchived: false,
      editorOpen: false,
      editingId: null,
      draft: blankDraft(),
      saving: false,
      loading: false,
      busyId: null,
      error: '',
      success: '',
      searchTimer: null,
      localAssignments: [],
    }
  },
  computed: {
    studentId() {
      return this.profile?.student?.id
    },
    canSave() {
      return Boolean(String(this.draft.body || '').trim()) && Boolean(this.draft.category)
    },
    assignmentOptions() {
      const fromProfile = (this.profile?.payload?.assignment_options || []).map((item) => ({
        id: item.id,
        label: item.label || `#${item.id}`,
      }))
      if (fromProfile.length) return fromProfile
      return this.localAssignments
    },
    visibleNotes() {
      return this.variant === 'preview' ? this.notes.slice(0, 3) : this.notes
    },
  },
  watch: {
    'profile.student.id'() {
      this.reset()
    },
    'profile.payload.notes': {
      immediate: true,
      handler(value) {
        if (Array.isArray(value)) {
          this.notes = value
          if (Array.isArray(this.profile?.payload?.categories) && this.profile.payload.categories.length) {
            this.categories = this.profile.payload.categories
          }
        }
      },
    },
  },
  mounted() {
    this.hydrateFromPayload()
    this.loadAssignments()
    if (!this.notes.length) this.refresh()
  },
  beforeUnmount() {
    window.clearTimeout(this.searchTimer)
  },
  methods: {
    hydrateFromPayload() {
      const payload = this.profile?.payload
      if (!payload) return
      if (Array.isArray(payload.notes)) this.notes = payload.notes
      if (Array.isArray(payload.categories) && payload.categories.length) this.categories = payload.categories
    },
    categoryLabel(value) {
      return this.t(`teacher.private_notes_category_${value}`)
    },
    categoryIcon(value) {
      return {
        strengths: 'bi bi-stars',
        difficulties: 'bi bi-exclamation-circle',
        learning_needs: 'bi bi-lightbulb',
        lesson_observations: 'bi bi-journal-text',
        recommendations: 'bi bi-signpost-2',
      }[value] || 'bi bi-journal-text'
    },
    setCategory(value) {
      this.category = value
      this.refresh()
    },
    toggleArchived() {
      this.showArchived = !this.showArchived
      this.refresh()
    },
    reset() {
      this.search = ''
      this.category = ''
      this.showArchived = false
      this.closeEditor()
      this.hydrateFromPayload()
      this.refresh()
      this.loadAssignments()
    },
    onSearchInput() {
      window.clearTimeout(this.searchTimer)
      this.searchTimer = window.setTimeout(() => this.refresh(), 250)
    },
    async refresh() {
      if (!this.studentId) return
      this.loading = true
      this.error = ''
      try {
        const payload = await learningApi.getTeacherPrivateNotes(this.studentId, {
          q: this.search.trim() || undefined,
          category: this.category || undefined,
          archived: this.showArchived ? '1' : undefined,
        })
        this.notes = payload?.notes || []
        if (Array.isArray(payload?.categories) && payload.categories.length) {
          this.categories = payload.categories
        }
      } catch (error) {
        this.error = error?.response?.data?.message || this.t('teacher.action_failed')
      } finally {
        this.loading = false
      }
    },
    async loadAssignments() {
      if (!this.studentId) return
      try {
        const payload = await learningApi.getTeacherAssignments()
        const rows = payload?.data || []
        this.localAssignments = rows
          .filter((row) => (row.recipients || []).some((recipient) => Number(recipient.student_id || recipient.student?.id) === Number(this.studentId)))
          .map((row) => ({
            id: row.id,
            label: row.title || `${row.surah_name || row.surah_number} · ${row.ayah_start}–${row.ayah_end}`,
          }))
      } catch (_) {
        this.localAssignments = []
      }
    },
    startCreate() {
      if (this.variant === 'preview') {
        this.$emit('open-section', 'notes')
        return
      }
      this.editingId = null
      this.draft = blankDraft()
      this.editorOpen = true
      this.error = ''
      this.success = ''
      this.$nextTick(() => this.$refs.body?.focus())
    },
    startEdit(note) {
      this.editingId = note.id
      this.draft = {
        category: note.category || 'lesson_observations',
        body: note.body || '',
        pinned: Boolean(note.pinned),
        surah_number: note.passage?.surah_number || '',
        ayah_start: note.passage?.ayah_start || '',
        ayah_end: note.passage?.ayah_end || '',
        teacher_assignment_id: note.assignment?.id ? String(note.assignment.id) : '',
      }
      this.editorOpen = true
      this.error = ''
      this.success = ''
      this.$nextTick(() => this.$refs.body?.focus())
    },
    closeEditor() {
      this.editorOpen = false
      this.editingId = null
      this.draft = blankDraft()
    },
    draftPayload() {
      const payload = {
        category: this.draft.category,
        body: String(this.draft.body || '').trim(),
        pinned: Boolean(this.draft.pinned),
      }
      if (this.draft.surah_number) payload.surah_number = Number(this.draft.surah_number)
      if (this.draft.ayah_start) payload.ayah_start = Number(this.draft.ayah_start)
      if (this.draft.ayah_end) payload.ayah_end = Number(this.draft.ayah_end)
      if (this.draft.teacher_assignment_id) payload.teacher_assignment_id = Number(this.draft.teacher_assignment_id)
      else payload.teacher_assignment_id = null
      if (!payload.surah_number) {
        payload.surah_number = null
        payload.ayah_start = null
        payload.ayah_end = null
      }
      return payload
    },
    async save() {
      if (!this.canSave || this.saving) return
      this.saving = true
      this.error = ''
      try {
        const payload = this.draftPayload()
        if (this.editingId) {
          await learningApi.updateTeacherPrivateNote(this.studentId, this.editingId, payload)
          this.success = this.t('teacher.private_notes_updated')
        } else {
          await learningApi.createTeacherPrivateNote(this.studentId, payload)
          this.success = this.t('teacher.private_notes_created')
        }
        this.closeEditor()
        await this.refresh()
      } catch (error) {
        this.error = error?.response?.data?.message || this.t('teacher.action_failed')
      } finally {
        this.saving = false
      }
    },
    async togglePin(note) {
      this.busyId = note.id
      this.error = ''
      try {
        await learningApi.updateTeacherPrivateNote(this.studentId, note.id, { pinned: !note.pinned })
        await this.refresh()
      } catch (error) {
        this.error = error?.response?.data?.message || this.t('teacher.action_failed')
      } finally {
        this.busyId = null
      }
    },
    async toggleArchive(note) {
      this.busyId = note.id
      this.error = ''
      try {
        if (note.archived) await learningApi.unarchiveTeacherPrivateNote(this.studentId, note.id)
        else await learningApi.archiveTeacherPrivateNote(this.studentId, note.id)
        await this.refresh()
      } catch (error) {
        this.error = error?.response?.data?.message || this.t('teacher.action_failed')
      } finally {
        this.busyId = null
      }
    },
    async shareNote(note) {
      if (!window.confirm(this.t('teacher.private_notes_share_confirm'))) return
      this.busyId = note.id
      this.error = ''
      try {
        await learningApi.shareTeacherPrivateNote(this.studentId, note.id)
        this.success = this.t('teacher.private_notes_shared_success')
        await this.refresh()
      } catch (error) {
        this.error = error?.response?.data?.message || this.t('teacher.action_failed')
      } finally {
        this.busyId = null
      }
    },
    async removeNote(note) {
      if (!window.confirm(this.t('teacher.private_notes_delete_confirm'))) return
      this.busyId = note.id
      this.error = ''
      try {
        await learningApi.deleteTeacherPrivateNote(this.studentId, note.id)
        await this.refresh()
      } catch (error) {
        this.error = error?.response?.data?.message || this.t('teacher.action_failed')
      } finally {
        this.busyId = null
      }
    },
  },
}
</script>
