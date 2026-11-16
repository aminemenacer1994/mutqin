<template>
  <TeacherDialog
    :open="open"
    class="teacher-playback-studio"
    size="xl"
    :title="heading"
    compact
    :close-label="t('teacher.playback_close')"
    :busy="Boolean(saving)"
    :dirty="hasUnsavedWork"
    @close="$emit('close')"
  >
    <template #pills>
      <span v-if="assignmentLabel && assignmentLabel !== passageLabel" class="badge rounded-pill teacher-pill">{{ assignmentLabel }}</span>
      <span v-if="passageLabel" class="badge rounded-pill teacher-pill">{{ passageLabel }}</span>
      <span v-if="checkerScore" class="badge rounded-pill teacher-pill" :class="scoreTone">{{ checkerScore }} {{ t('teacher.playback_match_label') }}</span>
      <span class="badge rounded-pill teacher-pill">{{ submittedLabel || t('teacher.unavailable') }}</span>
      <span v-if="durationLabel" class="badge rounded-pill teacher-pill">{{ durationLabel }}</span>
      <span class="badge rounded-pill teacher-pill" :class="reviewed ? 'is-score' : 'is-quiet'">
        {{ reviewed ? t('teacher.playback_status_reviewed') : t('teacher.playback_status_pending') }}
      </span>
    </template>
    <div class="teacher-playback">
          <p v-if="loading" class="teacher-playback__status" role="status">{{ t('teacher.playback_loading') }}</p>
          <p v-else-if="loadError" class="teacher-playback__status" role="alert">{{ loadError }}</p>

          <div v-else-if="payload" class="teacher-playback__layout">
            <div ref="readingPanel" class="teacher-playback__main" tabindex="0" :aria-label="passageLabel">
              <div class="teacher-playback__stage">
              <div class="teacher-playback__player" :class="{ 'is-playing': playing, 'is-empty': !hasAudio }">
                <audio
                  ref="player"
                  :src="hasAudio ? payload.audio.url : undefined"
                  preload="metadata"
                  @loadedmetadata="onMetadata"
                  @timeupdate="onTimeUpdate"
                  @play="playing = true"
                  @pause="playing = false"
                  @ended="playing = false"
                  @error="audioError = true"
                ></audio>
                <p v-if="!hasAudio" class="teacher-playback__hint teacher-playback__hint--solo"><i class="bi bi-mic-mute" aria-hidden="true"></i>{{ audioUnavailableLabel }}</p>
                <div v-else class="teacher-playback__transport" role="group" :aria-label="t('teacher.playback_review_title')">
                  <button type="button" class="teacher-playback__play" :disabled="!hasAudio" :aria-label="playing ? t('teacher.pause_recording') : t('teacher.play_recording')" :title="playing ? t('teacher.pause_recording') : t('teacher.play_recording')" @click="togglePlayback">
                    <i class="bi" :class="playing ? 'bi-pause-fill' : 'bi-play-fill'" aria-hidden="true"></i>
                  </button>
                  <div class="teacher-playback__seek">
                    <input
                      type="range"
                      min="0"
                      :max="trackEnd"
                      step="0.01"
                      :value="currentTime"
                      :disabled="!hasAudio || seekMax <= 0"
                      :aria-label="t('teacher.audio_position')"
                      :aria-valuetext="progressLabel"
                      @input="onSeek"
                    >
                  </div>
                  <p class="teacher-playback__times">
                    <span>{{ formatTime(currentTime) }}</span>
                    <span v-if="currentAyah">{{ t('teacher.ayah_n', { n: currentAyah }) }}</span>
                    <span>{{ formatTime(trackEnd) }}</span>
                  </p>
                </div>
                <div v-if="hasAudio" class="teacher-playback__tools" data-dialog-transient>
                  <label><span>{{ t('teacher.playback_speed') }}</span><select :value="playbackRate" @change="setRate(Number($event.target.value))"><option v-for="speed in speeds" :key="speed" :value="speed">{{ speed }}×</option></select></label>
                  <button v-if="canReplayAyah" type="button" @click="replayAyah">{{ t('teacher.repeat_ayah') }}</button>
                  <button v-if="hasPreviousFlagged" type="button" @click="jumpFlagged(-1)">{{ t('teacher.previous_flag') }}</button>
                  <button v-if="hasNextFlagged" type="button" @click="jumpFlagged(1)">{{ t('teacher.next_flag') }}</button>
                </div>
                <p v-if="hasAudio && timingNote" class="teacher-playback__hint">{{ timingNote }}</p>
              </div>
                <div class="teacher-playback__legend" :aria-label="t('teacher.playback_follow')">
                  <span class="is-correct">{{ t('teacher.word_status_correct') }}</span>
                  <span class="is-uncertain">
                    {{ t('teacher.playback_legend_uncertain') }}
                    <span class="visually-hidden">{{ t('teacher.playback_uncertain_help') }}</span>
                  </span>
                  <span class="is-flagged">{{ t('teacher.playback_legend_flagged') }}</span>
                  <span class="is-skipped">{{ t('teacher.word_status_skipped') }}</span>
                </div>
              </div>

              <nav v-if="ayahNumbers.length > 1" class="teacher-playback__navigation teacher-playback__chips" :aria-label="t('teacher.playback_ayah_navigation')" data-dialog-transient>
                <button v-for="ayah in ayahNumbers" :key="ayah" type="button" :class="{ 'is-current': ayah === (selectedWord?.ayah || currentAyah) }" :aria-current="ayah === (selectedWord?.ayah || currentAyah) ? 'true' : undefined" :disabled="Boolean(saving)" @click="selectAyah(ayah)">
                  {{ t('teacher.ayah_n', { n: ayah }) }}
                </button>
              </nav>
              <div ref="mushaf" class="teacher-playback__mushaf">
                <p v-if="mushafLoading" class="teacher-playback__hint" role="status">{{ t('teacher.loading_quran_text') }}</p>
                <TeacherReciteMushafAyahs
                  v-else-if="ayahs.length"
                  :ayahs="ayahs"
                  :active-key="activeKey"
                  :selected-key="selectedKey"
                  :marks="coachingMarks"
                  lines
                  interactive
                  @select-word="onSelectWord"
                />
                <p v-else class="teacher-playback__hint">{{ t('teacher.madani_text_unavailable') }}</p>
              </div>

              <details v-if="selectedCoaching" class="teacher-playback__compare">
                <summary>{{ t('teacher.coaching_compare') }}</summary>
                <p class="teacher-playback__hint">{{ comparisonSummary }}</p>
                <div class="teacher-playback__compare-grid">
                  <div>
                    <h3>{{ t('teacher.coaching_original') }}</h3>
                    <p>{{ wordStatusLabel(selectedCoaching.ai?.status) }}</p>
                    <p v-if="selectedGlyph.fontFamily" class="teacher-playback__glyph" lang="ar" dir="rtl" :style="{ fontFamily: selectedGlyph.fontFamily }">{{ selectedGlyph.text }}</p>
                  </div>
                  <div>
                    <h3>{{ t('teacher.coaching_latest') }}</h3>
                    <p v-if="selectedCoaching.comparison?.latest_retry">{{ retryStatusLabel(selectedCoaching.comparison.latest_retry) }}</p>
                    <p v-else class="teacher-playback__hint">{{ t('teacher.coaching_no_retry') }}</p>
                    <p v-if="selectedGlyph.fontFamily" class="teacher-playback__glyph" lang="ar" dir="rtl" :style="{ fontFamily: selectedGlyph.fontFamily }">{{ selectedGlyph.text }}</p>
                    <TeacherAudioFeedbackPlayer
                      v-if="selectedCoaching.comparison?.latest_retry?.audio?.available"
                      :src="selectedCoaching.comparison.latest_retry.audio.url"
                      :duration-ms="selectedCoaching.comparison.latest_retry.audio.duration_ms"
                      compact
                    />
                  </div>
                </div>
                <p v-if="selectedCoaching.comparison?.retries?.length" class="teacher-playback__hint">
                  {{ t('teacher.coaching_retry_count', { n: selectedCoaching.comparison.retries.length }) }}
                </p>
              </details>
            </div>

            <aside ref="coachingPanel" tabindex="0" :aria-label="t('teacher.playback_actions')" class="teacher-playback__side" :class="{ 'has-selection': Boolean(selectedKey) }">
              <p v-if="actionError" class="teacher-playback__alert" role="alert">{{ actionError }}</p>
              <p v-else-if="actionMessage" class="teacher-playback__saved" role="status">{{ actionMessage }}</p>
              <section class="teacher-playback__card teacher-playback__summary" :aria-label="t('teacher.playback_assessment_summary')">
                <div class="teacher-playback__section-head">
                  <h3>{{ t('teacher.playback_assessment_summary') }}</h3>
                  <span v-if="checkerScore" class="teacher-badge teacher-playback__match" :class="scoreTone">{{ checkerScore }} {{ t('teacher.playback_match_label') }}</span>
                </div>
                <dl v-if="assessedWords.length" class="teacher-playback__summary-counts">
                  <div class="is-correct" :class="{ 'is-empty': !summary.counts.correct }"><dt>{{ t('teacher.playback_matched_count') }}</dt><dd>{{ summary.counts.correct }}</dd></div>
                  <div class="is-uncertain" :class="{ 'is-empty': !summary.counts.uncertain, 'is-active': attentionFilter === 'uncertain' && summary.counts.uncertain > 0 }">
                    <dt aria-hidden="true">{{ t('teacher.playback_uncertain_count') }}</dt><dd aria-hidden="true">{{ summary.counts.uncertain }}</dd>
                    <button type="button" class="teacher-playback__count-hit" :aria-pressed="attentionFilter === 'uncertain'" :aria-label="attentionCountLabel('uncertain')" :disabled="summary.counts.uncertain === 0 || Boolean(saving)" @click="setAttention('uncertain')"></button>
                  </div>
                  <div class="is-flagged" :class="{ 'is-empty': !summary.counts.flagged, 'is-active': attentionFilter === 'flagged' && summary.counts.flagged > 0 }">
                    <dt aria-hidden="true">{{ t('teacher.playback_flagged_count') }}</dt><dd aria-hidden="true">{{ summary.counts.flagged }}</dd>
                    <button type="button" class="teacher-playback__count-hit" :aria-pressed="attentionFilter === 'flagged'" :aria-label="attentionCountLabel('flagged')" :disabled="summary.counts.flagged === 0 || Boolean(saving)" @click="setAttention('flagged')"></button>
                  </div>
                  <div class="is-skipped" :class="{ 'is-empty': !summary.counts.skipped, 'is-active': attentionFilter === 'skipped' && summary.counts.skipped > 0 }">
                    <dt aria-hidden="true">{{ t('teacher.playback_skipped_count') }}</dt><dd aria-hidden="true">{{ summary.counts.skipped }}</dd>
                    <button type="button" class="teacher-playback__count-hit" :aria-pressed="attentionFilter === 'skipped'" :aria-label="attentionCountLabel('skipped')" :disabled="summary.counts.skipped === 0 || Boolean(saving)" @click="setAttention('skipped')"></button>
                  </div>
                </dl>
                <p v-else class="teacher-playback__hint">{{ t('teacher.playback_no_assessment') }}</p>
                <p v-if="assessedWords.length && unassessedWordCount" class="teacher-playback__hint">{{ unassessedWordCount }} · {{ t('teacher.playback_word_unassessed') }}</p>
              </section>
              <section v-if="hasAttention" class="teacher-playback__card teacher-playback__follow" :aria-label="t('teacher.playback_attention_title')">
                <h3>{{ t('teacher.playback_attention_title') }}</h3>
                <p v-if="attentionFilter === 'uncertain'" class="teacher-playback__hint">{{ t('teacher.playback_uncertain_help') }}</p>
                <div v-if="summary.ayahs.length" class="teacher-playback__ayah-row">
                  <span>{{ t('teacher.playback_weak_ayahs') }}</span>
                  <div class="teacher-playback__chips">
                    <button
                      v-for="ayah in summary.ayahs"
                      :key="ayah.ayah"
                      type="button"
                      :class="{ 'is-current': ayah.ayah === currentAyah }"
                      @click="selectAyah(ayah.ayah)"
                    >{{ t('teacher.ayah_n', { n: ayah.ayah }) }}</button>
                  </div>
                </div>
                <ul v-if="visibleItems.length" class="teacher-playback__words">
                  <li v-for="item in visibleItems" :key="item.key">
                    <button
                      type="button"
                      :class="{ 'is-current': item.key === activeKey, 'is-selected': item.key === selectedKey }"
                      :aria-pressed="item.key === selectedKey"
                      :aria-label="attentionLabel(item)"
                      :disabled="Boolean(saving)"
                      @click="selectAttention(item)"
                    >
                      <span v-if="item.ayah" class="teacher-playback__word-ayah">{{ item.ayah }}</span>
                      <span v-if="glyphForKey(item.key)" class="teacher-playback__arabic" lang="ar" dir="rtl" :style="{ fontFamily: glyphForKey(item.key).fontFamily }">{{ glyphForKey(item.key).text }}</span>
                      <span v-else>{{ item.ayah ? t('teacher.ayah_n', { n: item.ayah }) : t('teacher.unavailable') }}</span>
                      <small>{{ wordStatusLabel(item.status) }}</small>
                    </button>

                  </li>
                </ul>
                <p v-else class="teacher-playback__hint">{{ t('teacher.playback_no_flags') }}</p>
                <button v-if="filteredItems.length > visibleItems.length" type="button" class="teacher-playback__more" @click="showAllAttention = true">
                  {{ t('teacher.playback_show_all') }}
                </button>
              </section>

              <section v-if="selectedKey" class="teacher-playback__card teacher-playback__word" :aria-label="t('teacher.coaching_word')">
                <h3>{{ t('teacher.coaching_word') }}</h3>
                  <p v-if="selectedGlyph.fontFamily" class="teacher-playback__glyph" lang="ar" dir="rtl" :style="{ fontFamily: selectedGlyph.fontFamily }">{{ selectedGlyph.text }}</p>
                  <p class="teacher-playback__hint">{{ selectedReference }}</p>
                  <p class="teacher-playback__selection-meta">{{ t('teacher.coaching_ai') }}: {{ wordStatusLabel(selectedWord?.status || selectedCoaching?.ai?.status) }}</p>
                  <p v-if="selectedWord?.recognised || selectedCoaching?.ai?.recognised" class="teacher-playback__heard">
                    <span>{{ t('teacher.playback_heard') }}</span>
                    <span lang="ar" dir="rtl">{{ selectedWord?.recognised || selectedCoaching?.ai?.recognised }}</span>
                  </p>
                  <p v-if="confidenceLabel" class="teacher-playback__hint">{{ confidenceLabel }}</p>
                  <p v-if="selectedDecision" class="teacher-playback__saved">{{ selectedDecision }}</p>
                  <p v-if="selectedCoaching" class="teacher-playback__hint">{{ reviewStatusLabel(selectedCoaching.review_status) }}</p>
                  <button v-if="canRepeatWord" type="button" class="btn btn-outline-secondary btn-sm" @click="repeatWord">
                    <i class="bi bi-play-fill" aria-hidden="true"></i>
                    {{ t('teacher.coaching_play_segment') }}
                  </button>
                  <label class="teacher-playback__field">
                    <span>{{ t('teacher.coaching_write') }}</span>
                    <textarea v-model="wordNote" rows="2" maxlength="2000" :disabled="Boolean(saving)" :placeholder="t('teacher.coaching_write_placeholder')"></textarea>
                  </label>
                  <div class="teacher-playback__action-row">
                    <TeacherVoiceNoteControls ref="wordVoice" :disabled="Boolean(saving)" @state-change="wordVoiceState = $event" />
                    <button type="button" class="btn btn-primary btn-sm" :disabled="Boolean(saving) || wordVoiceState.active || (!wordNote.trim() && !wordVoiceState.hasRecording)" @click="saveWord('correct')">
                      <i class="bi bi-send" aria-hidden="true"></i>
                      {{ saving === 'correct' ? t('teacher.saving') : t('teacher.coaching_send') }}
                    </button>
                  </div>
                  <details class="teacher-playback__fold">
                    <summary>{{ t('teacher.playback_actions') }}</summary>
                    <div class="teacher-playback__action-row">
                      <button type="button" class="btn btn-outline-secondary btn-sm" :disabled="Boolean(saving)" @click="saveWord('reviewed')">{{ t('teacher.playback_mark_reviewed') }}</button>
                      <button v-if="selectedNeedsAttention" type="button" class="btn btn-outline-secondary btn-sm" :disabled="Boolean(saving)" @click="saveWord('confirm')">{{ t('teacher.coaching_confirm') }}</button>
                      <button v-if="selectedNeedsAttention" type="button" class="btn btn-outline-secondary btn-sm" :disabled="Boolean(saving)" @click="saveWord('dismiss')">{{ t('teacher.coaching_dismiss') }}</button>
                      <button type="button" class="btn btn-outline-secondary btn-sm" :disabled="Boolean(saving)" @click="saveWord('retry')">{{ t('teacher.coaching_request_retry') }}</button>
                    </div>
                    <div v-if="selectedCoaching?.corrections?.length">
                      <p class="teacher-playback__hint">{{ t('teacher.coaching_history') }}</p>
                      <ul class="teacher-playback__history">
                        <li v-for="item in selectedCoaching.corrections" :key="item.id">
                          <p v-if="item.body">{{ item.body }}</p>
                          <TeacherAudioFeedbackPlayer
                            v-if="item.audio?.available"
                            :src="item.audio.url"
                            :duration-ms="item.audio.duration_ms"
                            compact
                          />
                          <button v-if="item.audio?.available" type="button" class="btn btn-link btn-sm" :disabled="Boolean(saving)" @click="deleteCorrectionAudio(item.id)">
                            {{ t('teacher.coaching_delete_audio') }}
                          </button>
                        </li>
                      </ul>
                    </div>
                    <div class="teacher-playback__word-practice">
                      <label class="teacher-playback__field">
                        <span>{{ t('teacher.playback_revision_due') }}</span>
                        <input v-model="wordDueAt" type="date" :min="today" :disabled="Boolean(saving)">
                      </label>
                      <button type="button" class="btn btn-outline-secondary btn-sm" :disabled="Boolean(saving) || !wordDueAt || wordDueAt < today" @click="saveWord('practice')">{{ t('teacher.coaching_assign_practice') }}</button>
                    </div>
                    <label class="teacher-playback__field">
                      <span>{{ t('teacher.coaching_set_status') }}</span>
                      <select v-model="wordStatus" :disabled="Boolean(saving)">
                        <option value="">{{ t('teacher.coaching_status_keep') }}</option>
                        <option value="awaiting_retry">{{ t('teacher.coaching_status_awaiting') }}</option>
                        <option value="needs_practice">{{ t('teacher.coaching_status_practice') }}</option>
                        <option value="improved">{{ t('teacher.coaching_status_improved') }}</option>
                        <option value="resolved">{{ t('teacher.coaching_status_resolved') }}</option>
                      </select>
                    </label>
                    <button type="button" class="btn btn-outline-secondary btn-sm" :disabled="Boolean(saving) || !wordStatus" @click="saveWord('status')">{{ t('teacher.coaching_save_status') }}</button>
                  </details>
              </section>

              <section class="teacher-playback__card teacher-playback__response" :aria-label="t('teacher.playback_actions')">
                <h3>{{ t('teacher.playback_feedback') }}</h3>
                <div v-if="payload.review?.feedback" class="teacher-playback__saved-feedback">
                  <p v-if="payload.review.feedback.body" class="teacher-playback__saved">{{ payload.review.feedback.body }}</p>
                  <p class="teacher-playback__hint">{{ t('teacher.playback_feedback_sent') }}</p>
                </div>
                <label class="teacher-playback__field">
                  <span class="visually-hidden">{{ t('teacher.playback_feedback') }}</span>
                  <textarea v-model="feedback" rows="2" maxlength="2000" :placeholder="t('teacher.playback_feedback_placeholder')" :disabled="saving"></textarea>
                </label>
                <div class="teacher-playback__action-row">
                  <TeacherVoiceNoteControls ref="voice" :disabled="Boolean(saving)" @state-change="voiceState = $event" />
                  <button type="button" class="btn btn-primary btn-sm" :disabled="Boolean(saving) || (!feedback.trim() && !voiceState.hasRecording) || voiceState.active" @click="sendFeedback">
                    <i class="bi bi-send" aria-hidden="true"></i>
                    {{ saving === 'feedback' ? t('teacher.saving') : t('teacher.playback_send_feedback') }}
                  </button>
                </div>

              </section>

              <details class="teacher-playback__card teacher-playback__private-note" :aria-label="t('teacher.playback_private_note')">
                  <summary><i class="bi bi-lock" aria-hidden="true"></i> {{ t('teacher.playback_private_note') }}</summary>
                  <p class="teacher-playback__hint">{{ t('teacher.playback_private_help') }}</p>
                  <p v-if="payload.review?.private_note?.body" class="teacher-playback__saved teacher-playback__private">{{ payload.review.private_note.body }}</p>
                  <label class="teacher-playback__field">
                    <span class="visually-hidden">{{ t('teacher.playback_private_note') }}</span>
                    <textarea v-model="privateNote" rows="2" maxlength="4000" :placeholder="t('teacher.playback_private_placeholder')" :disabled="saving"></textarea>
                  </label>
                  <button type="button" class="btn btn-outline-secondary btn-sm" :disabled="saving || !privateNote.trim()" @click="savePrivateNote">
                    {{ saving === 'note' ? t('teacher.saving') : t('teacher.playback_save_note') }}
                  </button>
              </details>

              <section class="teacher-playback__card teacher-playback__revision" :aria-label="t('teacher.playback_assign_revision')">
                  <h3>{{ t('teacher.playback_assign_revision') }}</h3>
                  <p class="teacher-playback__hint">{{ revisionHelp }}</p>
                  <div v-if="revisionAyahs.length" class="teacher-playback__chips" :aria-label="t('teacher.playback_weak_ayahs')">
                    <span v-for="ayah in revisionAyahs" :key="ayah">{{ t('teacher.ayah_n', { n: ayah }) }}</span>
                  </div>
                  <label class="teacher-playback__field">
                    <span>{{ t('teacher.playback_revision_due') }}</span>
                    <input v-model="dueAt" type="date" :min="today" :disabled="saving || !payload.suggested_revision">
                  </label>
                  <label class="teacher-playback__field">
                    <span>{{ t('teacher.playback_revision_note') }}</span>
                    <textarea v-model="revisionNote" rows="2" maxlength="2000" :placeholder="t('teacher.playback_revision_note_placeholder')" :disabled="saving || !payload.suggested_revision"></textarea>
                  </label>
                  <button type="button" class="btn btn-primary btn-sm" :disabled="saving || Boolean(payload.review?.revision) || !payload.suggested_revision || !dueAt || dueAt < today" @click="assignRevision">
                    <i class="bi bi-journal-check" aria-hidden="true"></i>
                    {{ saving === 'revision' ? t('teacher.saving') : t('teacher.playback_assign') }}
                  </button>
                  <p v-if="payload.review?.revision" class="teacher-playback__saved">{{ t('teacher.playback_revision_sent') }}<span v-if="assignedRevisionLabel"> · {{ assignedRevisionLabel }}</span></p>
              </section>


            </aside>
          </div>
    </div>
    <template #footer>
      <div v-if="payload && !loading" class="teacher-playback__review-status">
        <button type="button" class="teacher-playback__mark" :class="reviewed ? 'btn btn-outline-secondary' : 'btn btn-primary'" :disabled="Boolean(saving) || reviewed" @click="markReviewed">
          <i class="bi bi-check2-circle" aria-hidden="true"></i>
          {{ reviewed ? t('teacher.playback_status_reviewed') : t('teacher.playback_mark_reviewed') }}
        </button>
      </div>
    </template>
  </TeacherDialog>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import { learningApi, createClientMessageId } from '../../scripts/api/learning'
import { ayahRangeLabel } from '../../scripts/teacher/formatters'
import { normaliseTeacherWordStatus } from '../../scripts/teacher/wordReviewClass'
import { studioHasDraft, studioWordStatusKey, studioConfidenceValue } from '../../scripts/teacher/teacherStudioState'
import { buildTeacherPlaybackMushafLines } from '../../scripts/teacher/teacherReciteMushafView'
import {
  activeWordAt,
  ayahAtTime,
  ayahRepeatWindow,
  flaggedWordAt,
  playbackSummary,
  wordKey,
  wordWindow,
} from '../../scripts/teacher/playbackSync'
import TeacherAudioFeedbackPlayer from './TeacherAudioFeedbackPlayer.vue'
import TeacherDialog from './TeacherDialog.vue'
import TeacherReciteMushafAyahs from './TeacherReciteMushafAyahs.vue'
import TeacherVoiceNoteControls from './TeacherVoiceNoteControls.vue'

let playbackUid = 0

export default {
  name: 'TeacherRecitationPlaybackReview',
  components: { TeacherAudioFeedbackPlayer, TeacherDialog, TeacherReciteMushafAyahs, TeacherVoiceNoteControls },
  mixins: [i18nMixin],
  props: {
    open: { type: Boolean, default: false },
    studentId: { type: [Number, String], default: null },
    attemptId: { type: [Number, String], default: null },
    autoplay: { type: Boolean, default: false },
  },
  emits: ['close'],
  data() {
    playbackUid += 1
    return {
      titleId: `teacher-playback-title-${playbackUid}`,
      payload: null,
      loading: false,
      loadError: '',
      loadToken: 0,
      ayahs: [],
      mushafLoading: false,
      currentTime: 0,
      duration: 0,
      playing: false,
      audioError: false,
      voiceState: { hasRecording: false, active: false },
      wordVoiceState: { hasRecording: false, active: false },
      wordDrafts: {},
      wordStatusDrafts: {},
      playbackRate: 1,
      speeds: [0.5, 0.75, 1, 1.25],
      activeKey: '',
      selectedKey: '',
      selectedGlyph: { text: '', fontFamily: '' },
      repeatUntil: null,
      wordNote: '',
      wordStatus: '',
      attentionFilter: 'flagged',
      showAllAttention: false,
      feedback: '',
      feedbackRequest: null,
      privateNote: '',
      revisionNote: '',
      dueAt: '',
      initialDueAt: '',
      wordDueAt: '',
      initialWordDueAt: '',
      saving: '',
      actionError: '',
      actionMessage: '',
    }
  },
  computed: {
    hasUnsavedWork() {
      return studioHasDraft(this)
    },
    ayahNumbers() {
      return [...new Set(this.ayahs.flatMap(line => line.parts.map(part => part.ayah)).filter(ayah => Number.isInteger(ayah) && ayah > 0))].sort((a, b) => a - b)
    },
    glyphByKey() {
      const glyphs = new Map()
      for (const line of this.ayahs) {
        for (const part of line.parts) {
          if (!part.isEnd && part.word_index != null) glyphs.set(`${part.ayah}:${part.word_index}`, part)
        }
      }
      return glyphs
    },
    selectedNeedsAttention() {
      const status = this.selectedWord?.status || this.selectedCoaching?.ai?.status
      return studioWordStatusKey(status) !== 'teacher.playback_word_unassessed' && ['incorrect', 'partial', 'omitted', 'skipped'].includes(normaliseTeacherWordStatus({ status }))
    },
    hasAudio() {
      return Boolean(!this.audioError && this.payload?.audio?.available && this.payload?.audio?.url)
    },
    words() {
      return this.payload?.words || []
    },
    assessedWords() {
      return this.words.filter(word => String(word?.type || '').toUpperCase() === 'DELETION' || studioWordStatusKey(word?.status) !== 'teacher.playback_word_unassessed')
    },
    unassessedWordCount() {
      return this.words.length - this.assessedWords.length
    },
    summary() {
      return playbackSummary(this.assessedWords)
    },
    hasAttention() {
      const counts = this.summary?.counts || {}
      return ['flagged', 'uncertain', 'skipped'].some((key) => Number(counts[key]) > 0)
    },
    filteredItems() {
      return this.summary.items.filter((item) => {
        if (this.attentionFilter === 'uncertain') return item.status === 'partial'
        if (this.attentionFilter === 'skipped') return item.status === 'skipped' || item.status === 'omitted'
        return item.status === 'incorrect'
      })
    },
    visibleItems() {
      return this.showAllAttention ? this.filteredItems : this.filteredItems.slice(0, 6)
    },
    reviewed() {
      return this.payload?.review?.status === 'reviewed'
    },
    heading() {
      return this.payload?.student?.name || this.t('teacher.playback_review_title')
    },
    seekMax() {
      if (this.duration > 0) return this.duration
      const stored = Number(this.payload?.duration_ms) / 1000
      return Number.isFinite(stored) && stored > 0 ? stored : 0
    },
    progressLabel() {
      return `${this.formatTime(this.currentTime)} / ${this.formatTime(this.seekMax)}`
    },
    passageLabel() {
      const range = this.payload?.range
      return ayahRangeLabel(range?.surah_name, range?.from, range?.to, this.t)
    },
    assignmentLabel() {
      const assignment = this.payload?.assignment
      if (!assignment) return ''
      if (assignment.title) return assignment.title
      const kindKey = `teacher.hifz_${assignment.hifz_category}`
      const kind = this.t(kindKey)
      const kindLabel = kind && kind !== kindKey ? kind : ''
      return [kindLabel, ayahRangeLabel(assignment.surah_name, assignment.ayah_start, assignment.ayah_end, this.t)]
        .filter(Boolean)
        .join(' · ')
    },
    submittedLabel() {
      const value = this.payload?.submitted_at
      if (!value) return ''
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return ''
      return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
    },
    durationLabel() {
      if (this.duration > 0) return this.formatTime(this.duration)
      const ms = Number(this.payload?.duration_ms)
      if (Number.isFinite(ms) && ms > 0) return this.formatTime(ms / 1000)
      return ''
    },
    trackEnd() {
      return this.seekMax
    },
    scoreTone() {
      const score = Number(this.payload?.accuracy_percent)
      if (!Number.isFinite(score)) return 'is-quiet'
      if (score >= 80) return 'is-score'
      if (score >= 50) return 'is-partial'
      return 'is-flagged'
    },
    checkerScore() {
      const value = this.payload?.accuracy_percent
      return typeof value === 'number' && Number.isFinite(value) ? `${value}%` : ''
    },
    timingNote() {
      const timing = this.payload?.timing
      if (!timing?.total_words) return ''
      if (!timing.timed_words) return this.t('teacher.playback_no_timing')
      if (timing.timed_words < timing.total_words) return this.t('teacher.playback_partial_timing')
      return ''
    },
    audioUnavailableLabel() {
      const reason = this.payload?.audio?.reason
      if (reason === 'expired' || reason === 'purged' || reason === 'missing') return this.t('teacher.recording_not_retained')
      return this.t('teacher.recording_unavailable')
    },
    currentAyah() {
      return ayahAtTime(this.words, this.currentTime)
    },
    canReplayAyah() {
      return this.hasAudio && ayahRepeatWindow(this.words, this.selectedWord?.ayah || this.currentAyah)?.end != null
    },
    selectedWord() {
      return this.words.find((word) => wordKey(word) === this.selectedKey) || null
    },
    selectedCoaching() {
      return (this.payload?.coachings || []).find((row) => row.key === this.selectedKey) || null
    },
    coachingMarks() {
      const marks = {}
      for (const row of this.payload?.coachings || []) {
        if (!row?.key) continue
        marks[row.key] = row.decision || (row.reviewed_at ? 'reviewed' : '')
      }
      return marks
    },
    canRepeatWord() {
      const word = this.selectedWord || this.words.find((item) => wordKey(item) === this.activeKey)
      return this.hasAudio && wordWindow(word)?.end != null
    },
    selectedReference() {
      const ayah = this.selectedWord?.ayah || this.selectedCoaching?.ayah || this.selectedGlyph?.ayah
      const surah = this.payload?.range?.surah_name || this.selectedCoaching?.surah_name || ''
      if (!ayah) return ''
      return [surah, this.t('teacher.ayah_n', { n: ayah })].filter(Boolean).join(' · ')
    },
    confidenceLabel() {
      const value = studioConfidenceValue(this.selectedWord?.confidence ?? this.selectedCoaching?.ai?.confidence)
      return value ? this.t('teacher.coaching_confidence', { n: value }) : ''
    },
    selectedDecision() {
      const decision = this.selectedCoaching?.decision
      if (decision === 'confirmed') return this.t('teacher.coaching_confirmed')
      if (decision === 'dismissed') return this.t('teacher.coaching_dismissed')
      return ''
    },
    comparisonSummary() {
      const coaching = this.selectedCoaching
      if (!coaching) return ''
      if (coaching.comparison?.improved && coaching.improvement_basis === 'comparable') return this.t('teacher.coaching_improved_attempt')
      if (coaching.comparison?.improved && coaching.improvement_basis === 'teacher') return this.t('teacher.coaching_improved_teacher')
      if (coaching.review_status === 'resolved' && coaching.improvement_basis === 'teacher') return this.t('teacher.coaching_resolved_teacher')
      if (coaching.comparison?.latest_retry && !coaching.comparison.comparable) return this.t('teacher.coaching_not_comparable')
      return this.reviewStatusLabel(coaching.review_status)
    },
    hasNextFlagged() {
      return this.hasAudio && Boolean(flaggedWordAt(this.words, this.currentTime, 1))
    },
    hasPreviousFlagged() {
      return this.hasAudio && Boolean(flaggedWordAt(this.words, this.currentTime, -1))
    },
    today() {
      const date = new Date()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${date.getFullYear()}-${month}-${day}`
    },
    assignedRevisionLabel() {
      const revision = this.payload?.review?.revision
      if (!revision) return ''
      const range = ayahRangeLabel(revision.surah_name, revision.ayah_start, revision.ayah_end, this.t)
      const due = revision.due_at ? new Date(revision.due_at) : null
      const date = due && !Number.isNaN(due.getTime()) ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(due) : ''
      return [range, date].filter(Boolean).join(' · ')
    },
    revisionHelp() {
      const revision = this.payload?.suggested_revision
      if (!revision) return this.t('teacher.playback_no_passage')
      const range = ayahRangeLabel(revision.surah_name, revision.ayah_start, revision.ayah_end, this.t)
      return revision.focused
        ? this.t('teacher.playback_revision_focus', { range })
        : this.t('teacher.playback_revision_passage', { range })
    },
    revisionAyahs() {
      const revision = this.payload?.review?.revision || this.payload?.suggested_revision
      const start = Number(revision?.ayah_start)
      const end = Number(revision?.ayah_end || start)
      if (!Number.isInteger(start) || start < 1 || !Number.isInteger(end) || end < start || end - start > 5) return []
      return Array.from({ length: end - start + 1 }, (_, index) => start + index)
    },
  },
  watch: {
    open(value) {
      if (value) {
        this.load()
        window.addEventListener('keydown', this.onShortcut)
      } else {
        this.loadToken += 1
        window.removeEventListener('keydown', this.onShortcut)
        this.$refs.player?.pause()
      }
    },
    attemptId() {
      if (this.open) this.load()
    },
    activeKey(key) {
      if (!key) return
      this.$nextTick(() => {
        const node = this.$refs.mushaf?.querySelector?.(`[data-playback-key="${CSS.escape(key)}"]`)
        this.revealWord(node, true)
      })
    },
    attentionFilter() {
      this.showAllAttention = false
    },
    'summary.counts': {
      handler(counts) {
        const tally = counts || {}
        if (tally[this.attentionFilter]) return
        const next = ['flagged', 'uncertain', 'skipped'].find((key) => tally[key] > 0)
        if (next) this.attentionFilter = next
      },
    },
  },
  beforeUnmount() {
    this.loadToken += 1
    this.$refs.player?.pause()
    window.removeEventListener('keydown', this.onShortcut)
  },
  methods: {
    revealWord(node, automatic = false) {
      if (!node) return
      const reading = this.$refs.readingPanel
      const desktop = window.matchMedia('(min-width: 961px)').matches
      const scroller = desktop ? reading : reading?.closest('.modal-body')
      if (!scroller) return
      // Playback must never pull a teacher away from the mobile coaching form.
      if (automatic && !desktop) {
        const side = this.$refs.coachingPanel
        if (side?.contains(document.activeElement) || reading.getBoundingClientRect().bottom <= scroller.getBoundingClientRect().top) return
      }
      const bounds = scroller.getBoundingClientRect()
      const word = node.getBoundingClientRect()
      if (word.top < bounds.top + 12) scroller.scrollTop += word.top - bounds.top - 12
      else if (word.bottom > bounds.bottom - 12) scroller.scrollTop += word.bottom - bounds.bottom + 12
    },
    defaultDue() {
      const date = new Date()
      date.setDate(date.getDate() + 7)
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${date.getFullYear()}-${month}-${day}`
    },
    async load() {
      this.feedbackRequest = null
      if (!this.studentId || !this.attemptId) {
        this.loadError = this.t('teacher.playback_load_failed')
        return
      }
      const token = ++this.loadToken
      this.loading = true
      this.loadError = ''
      this.payload = null
      this.ayahs = []
      this.activeKey = ''
      this.selectedKey = ''
      this.selectedGlyph = { text: '', fontFamily: '' }
      this.repeatUntil = null
      this.wordNote = ''
      this.wordDrafts = {}
      this.wordStatusDrafts = {}
      this.$refs.voice?.discardRecording()
      this.$refs.wordVoice?.discardRecording()
      this.wordStatus = ''
      this.currentTime = 0
      this.duration = 0
      this.playing = false
      this.audioError = false
      this.feedback = ''
      this.privateNote = ''
      this.revisionNote = ''
      this.dueAt = this.defaultDue()
      this.initialDueAt = this.dueAt
      this.wordDueAt = this.dueAt
      this.initialWordDueAt = this.wordDueAt
      this.actionError = ''
      this.actionMessage = ''
      try {
        const payload = await learningApi.getTeacherRecitationPlayback(this.studentId, this.attemptId)
        if (token !== this.loadToken) return
        this.payload = payload
        const counts = this.summary.counts
        this.attentionFilter = ['flagged', 'uncertain', 'skipped'].find(key => counts[key] > 0) || 'flagged'
        this.showAllAttention = false
        this.loading = false
        await this.loadMushaf(token)
        if (this.autoplay) this.$nextTick(() => this.togglePlayback())
      } catch (err) {
        if (token !== this.loadToken) return
        this.loadError = this.failureMessage(err)
        this.loading = false
      }
    },
    async loadMushaf(token) {
      this.mushafLoading = true
      try {
        const lines = await buildTeacherPlaybackMushafLines({
          range: this.payload?.range,
          words: this.payload?.words || [],
        })
        if (token !== this.loadToken) return
        this.ayahs = lines
      } catch {
        if (token === this.loadToken) this.ayahs = []
      } finally {
        if (token === this.loadToken) this.mushafLoading = false
      }
    },
    applyPayload(payload) {
      if (payload?.attempt_id) this.payload = payload
    },
    failureMessage(err) {
      const errors = err?.response?.data?.errors
      if (errors && typeof errors === 'object') {
        const first = Object.values(errors).flat().find((item) => typeof item === 'string' && item)
        if (first) return first
      }
      return err?.response?.data?.message || this.t('teacher.action_failed')
    },
    async togglePlayback() {
      const player = this.$refs.player
      if (!player || !this.hasAudio) return
      if (player.paused) {
        try { await player.play() } catch { this.playing = false }
      } else {
        player.pause()
      }
    },
    onMetadata() {
      if (this.$refs.player) this.$refs.player.playbackRate = this.playbackRate
      const seconds = Number(this.$refs.player?.duration)
      if (Number.isFinite(seconds) && seconds > 0) this.duration = seconds
    },
    onTimeUpdate() {
      const seconds = Number(this.$refs.player?.duration)
      if (Number.isFinite(seconds) && seconds > this.duration) this.duration = seconds
      const time = Number(this.$refs.player?.currentTime || 0)
      this.currentTime = time
      const active = activeWordAt(this.words, time)
      this.activeKey = active?.key || ''
      if (this.repeatUntil != null && time >= this.repeatUntil) {
        this.$refs.player?.pause()
        this.repeatUntil = null
      }
    },
    onSeek(event) {
      this.seekTo(Number(event.target.value || 0), false)
    },
    seekTo(seconds, resume = false, keepRepeat = false) {
      if (!this.hasAudio) return
      const time = Number(seconds)
      if (!Number.isFinite(time) || time < 0) return
      if (!keepRepeat) this.repeatUntil = null
      this.currentTime = time
      const active = activeWordAt(this.words, time)
      this.activeKey = active?.key || ''
      const player = this.$refs.player
      if (!player) return
      player.currentTime = time
      if (resume && player.paused) player.play().catch(() => { this.playing = false })
    },
    setRate(rate) {
      this.playbackRate = rate
      if (this.$refs.player) this.$refs.player.playbackRate = rate
    },
    replayStart() {
      this.seekTo(0, true)
    },
    repeatWord() {
      const word = this.selectedWord || this.words.find((item) => wordKey(item) === this.activeKey)
      const window = wordWindow(word)
      if (!window) return
      this.repeatUntil = window.end
      this.seekTo(window.start, true, true)
    },
    replayAyah() {
      const ayah = this.selectedWord?.ayah || this.currentAyah
      const bounds = ayahRepeatWindow(this.words, ayah)
      if (!bounds) return
      this.repeatUntil = bounds.end
      this.seekTo(bounds.start, true, true)
    },
    jumpFlagged(direction) {
      const target = flaggedWordAt(this.words, this.currentTime, direction)
      if (!target) return
      this.seekTo(target.start, true)
    },
    onSelectWord(part) {
      const key = part?.key || ''
      if (!key || this.saving) return
      if (key !== this.selectedKey && (this.wordVoiceState.hasRecording || this.wordVoiceState.active)) {
        this.actionError = this.t('teacher.coaching_finish_recording')
        return
      }
      if (this.selectedKey) {
        this.wordDrafts[this.selectedKey] = this.wordNote
        this.wordStatusDrafts[this.selectedKey] = this.wordStatus
      }
      this.selectedKey = key
      this.selectedGlyph = {
        text: part?.isEnd ? '' : (part?.text || ''),
        fontFamily: part?.fontFamily || '',
        accessibleText: part?.accessibleText || '',
        ayah: part?.ayah,
      }
      this.wordStatus = this.wordStatusDrafts[key] || ''
      this.wordNote = this.wordDrafts[key] || ''
      const match = this.words.find((word) => wordKey(word) === key)
      const start = wordWindow(match)?.start ?? (Number.isFinite(part?.start) ? part.start : null)
      if (start != null) this.seekTo(start, this.hasAudio)
      this.$nextTick(() => this.revealCoachingField())
    },
    revealCoachingField() {
      const panel = this.$refs.coachingPanel
      const card = panel?.querySelector('.teacher-playback__word')
      const field = card?.querySelector('textarea')
      if (!card || !field) return
      const desktop = window.matchMedia('(min-width: 961px)').matches
      const scroller = desktop ? panel : panel.closest('.modal-body')
      if (!scroller) return
      const bounds = scroller.getBoundingClientRect()
      const cardBox = card.getBoundingClientRect()
      const fieldBox = field.getBoundingClientRect()
      const cardFits = cardBox.height <= bounds.height - 16
      if (cardFits) {
        if (cardBox.top < bounds.top + 4 || cardBox.bottom > bounds.bottom - 4) {
          scroller.scrollTop += cardBox.top - bounds.top - 4
        }
        return
      }
      if (fieldBox.top < bounds.top + 8 || fieldBox.bottom > bounds.bottom - 8) {
        scroller.scrollTop += fieldBox.top - bounds.top - 12
      }
    },
    glyphForKey(key) {
      return this.glyphByKey.get(key) || null
    },
    attentionLabel(item) {
      const glyph = this.glyphForKey(item.key)
      return [item.ayah ? this.t('teacher.ayah_n', { n: item.ayah }) : '', glyph?.accessibleText || this.t('teacher.word_n', { n: Number(item.wordIndex) + 1 }), this.wordStatusLabel(item.status)].filter(Boolean).join(' · ')
    },
    setAttention(filter) {
      if (this.saving || !this.summary?.counts?.[filter]) return
      this.attentionFilter = filter
    },
    attentionCountLabel(filter) {
      const keys = {
        flagged: 'teacher.playback_flagged_count',
        uncertain: 'teacher.playback_uncertain_count',
        skipped: 'teacher.playback_skipped_count',
      }
      return `${this.t(keys[filter] || 'teacher.playback_attention_title')} ${this.summary?.counts?.[filter] || 0}`
    },
    selectAttention(item) {
      const glyph = this.glyphForKey(item.key)
      const word = this.words.find((row) => wordKey(row) === item.key)
      this.onSelectWord({
        ...(glyph || {}),
        key: item.key,
        text: glyph?.text || '',
        fontFamily: glyph?.fontFamily || '',
        accessibleText: glyph?.accessibleText || '',
        ayah: glyph?.ayah || word?.ayah || item.ayah,
        start: wordWindow(word)?.start,
      })
      this.$nextTick(() => this.revealWord(this.$refs.mushaf?.querySelector(`[data-playback-key="${CSS.escape(item.key)}"]`)))
    },
    selectAyah(number) {
      for (const line of this.ayahs) {
        const glyph = line.parts.find(part => part.ayah === number && !part.isEnd)
        if (glyph) { this.onSelectWord({ ...glyph, key: `${glyph.ayah}:${glyph.word_index}` }); break }
      }
      this.$nextTick(() => this.revealWord(this.$refs.mushaf?.querySelector(`[data-playback-key="${this.selectedKey}"]`)))
    },
    reviewStatusLabel(status) {
      if (status === 'awaiting_retry') return this.t('teacher.coaching_status_awaiting')
      if (status === 'needs_practice') return this.t('teacher.coaching_status_practice')
      if (status === 'improved') return this.t('teacher.coaching_status_improved')
      if (status === 'resolved') return this.t('teacher.coaching_status_resolved')
      return this.t('teacher.playback_status_pending')
    },
    retryStatusLabel(retry) {
      if (!retry?.comparable || !retry.status) return this.t('teacher.coaching_not_comparable')
      if (retry.status === 'matched') return this.t('teacher.word_status_correct')
      if (retry.status === 'uncertain') return this.t('teacher.playback_legend_uncertain')
      if (retry.status === 'mismatch') return this.t('teacher.playback_legend_flagged')
      if (retry.status === 'skipped') return this.t('teacher.word_status_skipped')
      return this.t('teacher.coaching_not_comparable')
    },
    async saveWord(action) {
      if (this.saving || !this.selectedKey) return
      const [ayah, index] = this.selectedKey.split(':').map((value) => Number(value))
      if (!Number.isInteger(ayah) || !Number.isInteger(index)) return
      if (action === 'correct' && this.$refs.wordVoice?.isRecordingActive) return
      const recording = action === 'correct' ? (this.$refs.wordVoice?.recordingPayload?.() || null) : null
      if (action === 'correct' && !this.wordNote.trim() && !recording?.blob) {
        this.actionError = this.t('teacher.coaching_correction_required')
        this.actionMessage = ''
        return
      }
      if (action === 'status' && !this.wordStatus) return
      if (action === 'practice' && (!this.wordDueAt || this.wordDueAt < this.today)) return
      this.saving = action
      this.actionError = ''
      this.actionMessage = ''
      try {
        const payload = await learningApi.saveTeacherWordCoaching(this.studentId, this.attemptId, {
          ayah,
          word_index: index,
          action,
          body: action === 'correct' || action === 'practice' ? this.wordNote.trim() : undefined,
          review_status: action === 'status' ? this.wordStatus : undefined,
          due_at: action === 'practice' ? this.wordDueAt : undefined,
        }, recording)
        this.applyPayload(payload)
        if (action === 'correct') {
          delete this.wordDrafts[this.selectedKey]
          this.wordNote = ''
          this.$refs.wordVoice?.discardRecording()
        }
        if (action === 'status') {
          this.wordStatus = ''
          delete this.wordStatusDrafts[this.selectedKey]
        }
        if (action === 'practice') this.initialWordDueAt = this.wordDueAt
        this.actionMessage = this.t('teacher.coaching_saved')
      } catch (err) {
        this.actionError = this.failureMessage(err)
      } finally {
        this.saving = ''
      }
    },
    async deleteCorrectionAudio(correctionId) {
      if (this.saving || !correctionId) return
      this.saving = 'audio'
      this.actionError = ''
      this.actionMessage = ''
      try {
        const payload = await learningApi.deleteTeacherWordCoachingAudio(this.studentId, this.attemptId, correctionId)
        this.applyPayload(payload)
        this.actionMessage = this.t('teacher.coaching_audio_deleted')
      } catch (err) {
        this.actionError = this.failureMessage(err)
      } finally {
        this.saving = ''
      }
    },
    formatTime(value) {
      const seconds = Math.max(0, Math.floor(Number(value) || 0))
      return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
    },
    wordStatusLabel(status) {
      return this.t(studioWordStatusKey(status))
    },
    async sendFeedback() {
      if (this.saving) return
      if (this.$refs.voice?.isRecordingActive) return
      const recording = this.$refs.voice?.recordingPayload?.() || null
      if (!this.feedback.trim() && !recording?.blob) {
        this.actionError = this.t('teacher.playback_feedback_required')
        this.actionMessage = ''
        return
      }
      const body = this.feedback.trim()
      if (!this.feedbackRequest || this.feedbackRequest.body !== body || this.feedbackRequest.blob !== recording?.blob) {
        this.feedbackRequest = { body, blob: recording?.blob, id: createClientMessageId() }
      }
      this.saving = 'feedback'
      this.actionError = ''
      this.actionMessage = ''
      try {
        const payload = await learningApi.saveTeacherRecitationFeedback(this.studentId, this.attemptId, {
          body,
          client_message_id: this.feedbackRequest.id,
        }, recording)
        this.applyPayload(payload)
        this.feedback = ''
        this.feedbackRequest = null
        this.$refs.voice?.discardRecording()
        this.actionMessage = this.t('teacher.playback_feedback_sent')
      } catch (err) {
        this.actionError = this.failureMessage(err)
      } finally {
        this.saving = ''
      }
    },
    async savePrivateNote() {
      const body = this.privateNote.trim()
      if (this.saving || !body) return
      this.saving = 'note'
      this.actionError = ''
      this.actionMessage = ''
      try {
        const payload = await learningApi.saveTeacherRecitationPrivateNote(this.studentId, this.attemptId, body)
        this.applyPayload(payload)
        this.privateNote = ''
        this.actionMessage = this.t('teacher.playback_note_saved')
      } catch (err) {
        this.actionError = this.failureMessage(err)
      } finally {
        this.saving = ''
      }
    },
    async assignRevision() {
      if (this.saving || !this.payload?.suggested_revision || !this.dueAt || this.dueAt < this.today) return
      this.saving = 'revision'
      this.actionError = ''
      this.actionMessage = ''
      try {
        const payload = await learningApi.assignTeacherRecitationRevision(this.studentId, this.attemptId, {
          due_at: this.dueAt,
          feedback: this.revisionNote.trim() || undefined,
        })
        this.applyPayload(payload)
        this.revisionNote = ''
        this.initialDueAt = this.dueAt
        this.actionMessage = this.t('teacher.playback_revision_sent')
      } catch (err) {
        this.actionError = this.failureMessage(err)
      } finally {
        this.saving = ''
      }
    },
    async markReviewed() {
      if (this.saving || this.reviewed) return
      this.saving = 'review'
      this.actionError = ''
      this.actionMessage = ''
      try {
        const payload = await learningApi.markTeacherRecitationReviewed(this.studentId, this.attemptId)
        this.applyPayload(payload)
        this.actionMessage = this.t('teacher.playback_reviewed_saved')
      } catch (err) {
        this.actionError = this.failureMessage(err)
      } finally {
        this.saving = ''
      }
    },
    onDialogKeydown(event) {
      this.onShortcut(event)
    },
    onShortcut(event) {
      if (!this.open || event.key === 'Escape') return
      const tag = event.target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON' || tag === 'A') return
      if (event.target?.closest?.('[role="button"]')) return
      if (event.key === ' ' || event.key === 'k' || event.key === 'K') {
        event.preventDefault()
        this.togglePlayback()
      }
    },
  },
}
</script>
