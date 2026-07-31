<template>
  <div
    v-if="visible"
    class="modal-overlay mutqin-modal-overlay ayah-notes-modal-overlay"
    @click.self="close"
  >
    <div class="modal-dialog modal-dialog-centered mutqin-modal-dialog ayah-notes-dialog">
      <div
        class="modal-content mutqin-modal-surface ayah-notes-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ayahNotesModalTitle"
      >
        <div class="modal-header ayah-notes-header">
          <div class="ayah-notes-header-text">
            <div class="ayah-notes-header-row">
              <h2 id="ayahNotesModalTitle">{{ t('memorisation.ayahNotes.title') }}</h2>
              <span class="ayah-notes-privacy-chip">{{ t('memorisation.ayahNotes.privacyChip') }}</span>
            </div>
            <p class="ayah-notes-context">{{ contextBadge }}</p>
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
          <section class="ayah-notes-composer" :class="{ 'is-editing': !!editingNoteId }">
            <div class="ayah-notes-composer-head">
              <strong>{{ editingNoteId ? t('memorisation.ayahNotes.editingLabel') : t('memorisation.ayahNotes.composeLabel') }}</strong>
              <button
                v-if="editingNoteId"
                type="button"
                class="ayah-notes-text-btn"
                :disabled="busy"
                @click="cancelEdit"
              >
                {{ t('common.cancel') }}
              </button>
            </div>

            <label class="ayah-notes-field">
              <span>{{ t('memorisation.ayahNotes.titleLabel') }}</span>
              <input
                v-model="draftTitle"
                type="text"
                class="form-control ayah-notes-input"
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
                class="form-control ayah-notes-textarea"
                rows="4"
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

            <div v-if="formError" class="alert alert-danger ayah-notes-form-alert" role="alert">
              {{ formError }}
            </div>

            <div class="ayah-notes-composer-actions">
              <button
                type="button"
                class="btn btn-primary ayah-notes-save-btn"
                :disabled="busy || !canSave"
                @click="saveDraft"
              >
                <i class="bi" :class="editingNoteId ? 'bi-check-lg' : 'bi-send'" aria-hidden="true"></i>
                <span>{{ editingNoteId ? t('memorisation.ayahNotes.saveChanges') : t('memorisation.ayahNotes.submitNote') }}</span>
              </button>
            </div>
          </section>

          <section class="ayah-notes-list-section" :class="{ 'is-empty': !loading && !notes.length }">
            <div class="ayah-notes-list-head">
              <h3>{{ t('memorisation.ayahNotes.yourNotes') }}</h3>
              <span v-if="!loading && notes.length" class="ayah-notes-list-count">{{ notes.length }}</span>
            </div>

            <div v-if="loading" class="ayah-notes-empty ayah-notes-empty--loading" role="status">
              <i class="bi bi-hourglass-split" aria-hidden="true"></i>
              <p>{{ t('memorisation.ayahNotes.loading') }}</p>
            </div>

            <div v-else-if="!notes.length" class="ayah-notes-empty">
              <span class="ayah-notes-empty-icon" aria-hidden="true">
                <i class="bi bi-journal-text"></i>
              </span>
              <strong>{{ t('memorisation.ayahNotes.emptyTitle') }}</strong>
              <p>{{ t('memorisation.ayahNotes.empty') }}</p>
            </div>

            <ul v-else class="ayah-notes-list" role="list">
              <li
                v-for="note in notes"
                :key="note.id"
                class="ayah-notes-item"
                :class="{ 'is-editing': editingNoteId === note.id }"
              >
                <div class="ayah-notes-item-main">
                  <div class="ayah-notes-item-copy">
                    <div class="ayah-notes-item-title-row">
                      <span class="ayah-notes-item-title">{{ noteTitle(note) }}</span>
                      <span
                        v-if="editingNoteId === note.id"
                        class="ayah-notes-editing-badge"
                      >{{ t('memorisation.ayahNotes.editingBadge') }}</span>
                    </div>
                    <p v-if="notePreview(note)" class="ayah-notes-item-body">{{ notePreview(note) }}</p>
                    <time class="ayah-notes-item-time" :datetime="note.updated_at">
                      {{ formatNoteDate(note.updated_at) }}
                    </time>
                  </div>
                  <div class="ayah-notes-item-actions">
                    <button
                      type="button"
                      class="ayah-notes-item-action"
                      :disabled="busy || !!pendingDeleteNote || editingNoteId === note.id"
                      @click="startEdit(note)"
                    >
                      <i class="bi bi-pencil" aria-hidden="true"></i>
                      <span>{{ t('memorisation.ayahNotes.edit') }}</span>
                    </button>
                    <button
                      type="button"
                      class="ayah-notes-item-action ayah-notes-item-action--danger"
                      :disabled="busy || !!pendingDeleteNote"
                      @click="requestDelete(note)"
                    >
                      <i class="bi bi-trash3" aria-hidden="true"></i>
                      <span>{{ t('memorisation.ayahNotes.delete') }}</span>
                    </button>
                  </div>
                </div>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  </div>

  <Teleport to="body">
    <div
      v-if="visible && pendingDeleteNote"
      class="modal-overlay mutqin-modal-overlay ayah-notes-delete-overlay"
      @click.self="cancelDelete"
    >
      <div class="modal-dialog modal-dialog-centered mutqin-modal-dialog ayah-notes-delete-dialog">
        <div
          class="modal-content mutqin-modal-surface confirm-modal ayah-notes-delete-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ayahNotesDeleteTitle"
        >
          <div class="modal-header">
            <div class="ayah-notes-delete-heading">
              <i class="bi bi-exclamation-triangle-fill" aria-hidden="true"></i>
              <h2 id="ayahNotesDeleteTitle">{{ t('memorisation.ayahNotes.deleteConfirmTitle') }}</h2>
            </div>
            <button
              type="button"
              class="modal-close-btn"
              :aria-label="t('common.close')"
              :disabled="busy"
              @click="cancelDelete"
            >
              <i class="bi bi-x-lg" aria-hidden="true"></i>
            </button>
          </div>
          <div class="modal-body">
            <p class="confirm-copy">{{ t('memorisation.ayahNotes.deleteConfirm') }}</p>
          </div>
          <div class="modal-footer mutqin-modal-footer">
            <div class="mutqin-modal-actions mutqin-modal-actions--end ayah-notes-delete-actions">
              <button
                type="button"
                class="mutqin-modal-btn mutqin-modal-btn--secondary"
                :disabled="busy"
                @click="cancelDelete"
              >
                <span>{{ t('common.cancel') }}</span>
              </button>
              <button
                type="button"
                class="mutqin-modal-btn mutqin-modal-btn--destructive"
                :disabled="busy"
                @click="confirmDelete"
              >
                <i class="bi bi-trash3" aria-hidden="true"></i>
                <span>{{ t('memorisation.ayahNotes.delete') }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
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
  emits: ['close', 'changed', 'toast'],
  data() {
    return {
      notes: [],
      loading: false,
      busy: false,
      draftTitle: '',
      draftBody: '',
      editingNoteId: null,
      formError: '',
      pendingDeleteNote: null,
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
        this.pendingDeleteNote = null
        this.loadNotes()
        this.$nextTick(() => this.focusComposerIfAppropriate())
      } else {
        this.pendingDeleteNote = null
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
      if (this.pendingDeleteNote) {
        this.cancelDelete()
        return
      }
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
    notifyToast(message, kind = 'success') {
      this.$emit('toast', { message, kind })
    },
    formatNoteDate(value) {
      if (!value) return ''
      try {
        return new Intl.DateTimeFormat(undefined, {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        }).format(new Date(value))
      } catch (_) {
        return String(value)
      }
    },
    noteTitle(note) {
      const title = String(note?.title || '').trim()
      if (title) return title
      const body = String(note?.body || '').trim().replace(/\s+/g, ' ')
      if (!body) return this.t('memorisation.ayahNotes.untitled')
      return body.length > 72 ? `${body.slice(0, 72)}…` : body
    },
    notePreview(note) {
      const title = String(note?.title || '').trim()
      const body = String(note?.body || '').trim()
      if (!body) return ''
      // Untitled notes already show body as the title — skip duplicate preview.
      if (!title) return ''
      return body
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
      this.pendingDeleteNote = null
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
      const wasEditing = !!this.editingNoteId
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
        this.notifyToast(
          wasEditing
            ? this.t('memorisation.ayahNotes.updatedSuccess')
            : this.t('memorisation.ayahNotes.savedSuccess'),
          'success'
        )
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
    requestDelete(note) {
      if (!note?.id || this.busy) return
      this.pendingDeleteNote = note
    },
    cancelDelete() {
      this.pendingDeleteNote = null
    },
    async confirmDelete() {
      const note = this.pendingDeleteNote
      if (!note?.id || this.busy) return
      this.busy = true
      this.formError = ''
      try {
        await learningApi.deleteAyahNote(note.id)
        if (this.editingNoteId === note.id) this.resetDraft()
        this.pendingDeleteNote = null
        await this.loadNotes()
        this.notifyToast(this.t('memorisation.ayahNotes.deletedSuccess'), 'success')
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
