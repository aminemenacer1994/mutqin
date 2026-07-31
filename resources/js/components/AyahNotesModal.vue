<template>
  <div
    v-if="visible"
    class="modal-overlay mutqin-modal-overlay ayah-notes-modal-overlay"
    @click.self="close"
  >
    <div class="modal-dialog modal-dialog-centered modal-xl mutqin-modal-dialog ayah-notes-dialog">
      <div
        class="modal-content mutqin-modal-surface ayah-notes-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ayahNotesModalTitle"
      >
        <div class="modal-header">
          <div class="modal-header-text">
            <div class="modal-context-badge">{{ contextBadge }}</div>
            <h2 id="ayahNotesModalTitle">{{ t('memorisation.ayahNotes.title') }}</h2>
            <p>{{ t('memorisation.ayahNotes.subtitle') }}</p>
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

        <div class="modal-body ayah-notes-modal-body">
          <div class="ayah-notes-composer">
            <label class="ayah-notes-field">
              <span>{{ t('memorisation.ayahNotes.titleLabel') }}</span>
              <input
                v-model="draftTitle"
                type="text"
                class="ayah-notes-input"
                maxlength="120"
                autocomplete="off"
                enterkeyhint="next"
                :placeholder="t('memorisation.ayahNotes.titlePlaceholder')"
                :disabled="busy"
              />
            </label>
            <label class="ayah-notes-field">
              <span>{{ t('memorisation.ayahNotes.bodyLabel') }}</span>
              <textarea
                ref="bodyInput"
                v-model="draftBody"
                class="ayah-notes-textarea"
                rows="5"
                maxlength="10000"
                autocomplete="off"
                enterkeyhint="done"
                :placeholder="t('memorisation.ayahNotes.bodyPlaceholder')"
                :disabled="busy"
                @keydown.meta.enter.prevent="saveDraft"
                @keydown.ctrl.enter.prevent="saveDraft"
              ></textarea>
              <span class="ayah-notes-char-count">{{ draftBody.length }}/10000</span>
            </label>
            <div v-if="formError" class="ayah-notes-error" role="alert">
              <i class="bi bi-exclamation-circle-fill" aria-hidden="true"></i>
              {{ formError }}
            </div>
            <div class="ayah-notes-composer-actions">
              <button
                v-if="editingNoteId"
                type="button"
                class="mutqin-modal-btn mutqin-modal-btn--ghost"
                :disabled="busy"
                @click="cancelEdit"
              >
                <span>{{ t('common.cancel') }}</span>
              </button>
              <button
                type="button"
                class="mutqin-modal-btn mutqin-modal-btn--primary"
                :disabled="busy || !canSave"
                @click="saveDraft"
              >
                <i class="bi" :class="editingNoteId ? 'bi-check-lg' : 'bi-plus-lg'" aria-hidden="true"></i>
                <span>{{ editingNoteId ? t('memorisation.ayahNotes.saveChanges') : t('memorisation.ayahNotes.addNote') }}</span>
              </button>
            </div>
          </div>

          <div class="ayah-notes-list-section">
            <div class="ayah-notes-list-head">
              <h3>{{ t('memorisation.ayahNotes.yourNotes') }}</h3>
              <span class="ayah-notes-list-count">{{ notes.length }}</span>
            </div>

            <div v-if="loading" class="ayah-notes-empty" role="status">
              <i class="bi bi-hourglass-split" aria-hidden="true"></i>
              <p>{{ t('memorisation.ayahNotes.loading') }}</p>
            </div>

            <div v-else-if="!notes.length" class="ayah-notes-empty">
              <i class="bi bi-journal-text" aria-hidden="true"></i>
              <p>{{ t('memorisation.ayahNotes.empty') }}</p>
            </div>

            <ul v-else class="ayah-notes-list" role="list">
              <li
                v-for="note in notes"
                :key="note.id"
                class="ayah-notes-item"
                :class="{ 'is-editing': editingNoteId === note.id }"
              >
                <div class="ayah-notes-item-head">
                  <strong v-if="note.title">{{ note.title }}</strong>
                  <time :datetime="note.updated_at">{{ formatNoteDate(note.updated_at) }}</time>
                </div>
                <p class="ayah-notes-item-body">{{ note.body }}</p>
                <div class="ayah-notes-item-actions">
                  <button
                    type="button"
                    class="mutqin-modal-btn mutqin-modal-btn--ghost ayah-notes-item-btn"
                    :disabled="busy"
                    @click="startEdit(note)"
                  >
                    <i class="bi bi-pencil" aria-hidden="true"></i>
                    <span>{{ t('memorisation.ayahNotes.edit') }}</span>
                  </button>
                  <button
                    type="button"
                    class="mutqin-modal-btn mutqin-modal-btn--destructive ayah-notes-item-btn"
                    :disabled="busy"
                    @click="removeNote(note)"
                  >
                    <i class="bi bi-trash" aria-hidden="true"></i>
                    <span>{{ t('memorisation.ayahNotes.delete') }}</span>
                  </button>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import learningApi from '../scripts/api/learning'

export default {
  name: 'AyahNotesModal',
  props: {
    visible: { type: Boolean, default: false },
    surahNumber: { type: Number, default: 0 },
    ayahNumber: { type: Number, default: 0 },
    surahName: { type: String, default: '' },
  },
  emits: ['close', 'changed'],
  data() {
    return {
      notes: [],
      loading: false,
      busy: false,
      draftTitle: '',
      draftBody: '',
      editingNoteId: null,
      formError: '',
    }
  },
  computed: {
    contextBadge() {
      const surah = this.surahName || this.t('memorisation.ayahNotes.surahFallback', { number: this.surahNumber })
      return this.t('memorisation.ayahNotes.contextBadge', {
        surah,
        ayah: this.ayahNumber,
      })
    },
    canSave() {
      return String(this.draftBody || '').trim().length > 0
    },
  },
  watch: {
    visible(next) {
      if (next) {
        this.resetDraft()
        this.loadNotes()
        this.$nextTick(() => this.focusComposerIfAppropriate())
      }
    },
  },
  methods: {
    t(key, params) {
      return this.$t ? this.$t(key, params) : key
    },
    shouldAutofocusComposer() {
      if (typeof window === 'undefined') return false
      try {
        const coarse = window.matchMedia('(pointer: coarse)').matches
        const narrow = window.matchMedia('(max-width: 767.98px)').matches
        return !(coarse || narrow)
      } catch (_) {
        return true
      }
    },
    focusComposerIfAppropriate() {
      if (!this.shouldAutofocusComposer()) return
      this.$refs.bodyInput?.focus?.()
    },
    close() {
      if (this.busy) return
      this.$emit('close')
    },
    resetDraft() {
      this.draftTitle = ''
      this.draftBody = ''
      this.editingNoteId = null
      this.formError = ''
    },
    cancelEdit() {
      this.resetDraft()
    },
    formatNoteDate(value) {
      if (!value) return ''
      try {
        return new Intl.DateTimeFormat(undefined, {
          dateStyle: 'medium',
          timeStyle: 'short',
        }).format(new Date(value))
      } catch (_) {
        return String(value)
      }
    },
    async loadNotes() {
      if (!this.surahNumber || !this.ayahNumber) {
        this.notes = []
        return
      }
      this.loading = true
      this.formError = ''
      try {
        this.notes = await learningApi.getAyahNotes({
          surah_number: this.surahNumber,
          ayah_number: this.ayahNumber,
        })
      } catch (error) {
        console.error('Failed to load ayah notes', error)
        this.formError = this.t('memorisation.ayahNotes.loadFailed')
        this.notes = []
      } finally {
        this.loading = false
      }
    },
    startEdit(note) {
      this.editingNoteId = note.id
      this.draftTitle = note.title || ''
      this.draftBody = note.body || ''
      this.formError = ''
      this.$nextTick(() => {
        this.$refs.bodyInput?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' })
        this.focusComposerIfAppropriate()
      })
    },
    async saveDraft() {
      const body = String(this.draftBody || '').trim()
      if (!body || this.busy) return
      this.busy = true
      this.formError = ''
      try {
        const title = String(this.draftTitle || '').trim() || null
        if (this.editingNoteId) {
          await learningApi.updateAyahNote(this.editingNoteId, { title, body })
        } else {
          await learningApi.createAyahNote({
            surah_number: this.surahNumber,
            ayah_number: this.ayahNumber,
            title,
            body,
          })
        }
        this.resetDraft()
        await this.loadNotes()
        this.$emit('changed', {
          surahNumber: this.surahNumber,
          ayahNumber: this.ayahNumber,
          count: this.notes.length,
        })
      } catch (error) {
        console.error('Failed to save ayah note', error)
        const message = error?.response?.data?.message
          || error?.response?.data?.errors?.body?.[0]
          || this.t('memorisation.ayahNotes.saveFailed')
        this.formError = message
      } finally {
        this.busy = false
      }
    },
    async removeNote(note) {
      if (!note?.id || this.busy) return
      const confirmed = window.confirm(this.t('memorisation.ayahNotes.deleteConfirm'))
      if (!confirmed) return
      this.busy = true
      this.formError = ''
      try {
        await learningApi.deleteAyahNote(note.id)
        if (this.editingNoteId === note.id) this.resetDraft()
        await this.loadNotes()
        this.$emit('changed', {
          surahNumber: this.surahNumber,
          ayahNumber: this.ayahNumber,
          count: this.notes.length,
        })
      } catch (error) {
        console.error('Failed to delete ayah note', error)
        this.formError = this.t('memorisation.ayahNotes.deleteFailed')
      } finally {
        this.busy = false
      }
    },
  },
}
</script>
