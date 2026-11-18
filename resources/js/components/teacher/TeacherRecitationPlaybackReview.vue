<template>
  <TeacherDialog
    :open="open"
    class="teacher-playback-studio"
    size="xl"
    :title="heading"
    compact
    :close-label="t('teacher.playback_close')"
    :back-label="t('teacher.playback_back')"
    :busy="Boolean(saving)"
    :dirty="hasUnsavedWork"
    @close="$emit('close')"
  >
    <template #pills>
      <span v-if="passageLabel" class="teacher-playback__crumb">{{ passageLabel }}</span>
      <TeacherWordingMatch v-if="payload && checkerScore" class="teacher-playback__crumb" :class="scoreTone">{{ t('teacher.playback_wording_score', { n: checkerScore }) }}</TeacherWordingMatch>
      <span v-if="payload" class="teacher-playback__crumb" :class="reviewTone">{{ reviewLabel }}</span>
    </template>
    <div class="teacher-playback">
          <p v-if="loading" class="teacher-playback__status" role="status">{{ t('teacher.playback_loading') }}</p>
          <p v-else-if="loadError" class="teacher-playback__status" role="alert">{{ loadError }}</p>

          <div v-else-if="payload" class="teacher-playback__layout">
            <div ref="readingPanel" class="teacher-playback__main" tabindex="0" :aria-label="passageLabel">
              <div class="teacher-playback__stage">
              <div class="teacher-playback__player" :class="{ 'is-playing': playing, 'is-empty': !hasAudio }">
                <audio
                  v-if="hasAudio"
                  ref="player"
                  :src="payload.audio.url"
                  preload="metadata"
                  @loadedmetadata="onMetadata"
                  @timeupdate="onTimeUpdate"
                  @play="playing = true"
                  @pause="playing = false"
                  @ended="playing = false"
                  @error="audioError = true"
                ></audio>
                <div v-if="hasAudio && !audioError" class="teacher-playback__transport" role="group" :aria-label="t('teacher.playback_review_title')">
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
                    <p class="teacher-playback__times">
                      <span>{{ formatTime(currentTime) }}</span>
                      <span>{{ formatTime(trackEnd) }}</span>
                    </p>
                  </div>
                </div>
                <p v-if="hasAudio && !audioError && !audioReady" class="teacher-playback__hint" role="status">{{ t('teacher.recording_state_loading') }}</p>
                <div v-if="hasAudio && audioError" class="teacher-playback__missing">
                  <p><i class="bi bi-exclamation-circle" aria-hidden="true"></i><strong>{{ t('teacher.recording_state_unavailable') }}</strong></p>
                  <p>{{ t('teacher.recording_play_failed') }}</p>
                </div>
                <div v-else-if="!hasAudio" class="teacher-playback__missing">
                  <p>
                    <i class="bi bi-mic" aria-hidden="true"></i>
                    <strong>{{ audioGap.title }}</strong>
                    <span>{{ t('teacher.recording_unavailable_short') }}</span>
                  </p>
                  <button v-if="canRequestRecording" type="button" class="btn btn-outline-secondary btn-sm" @click="requestAnotherRecording">{{ t('teacher.recording_request') }}</button>
                </div>
                <div class="teacher-playback__legend" :aria-label="t('teacher.playback_follow')">
                  <span class="is-correct">{{ t('teacher.word_status_correct') }}</span>
                  <span class="is-uncertain">
                    {{ t('teacher.playback_legend_uncertain') }}
                    <span class="visually-hidden">{{ t('teacher.playback_uncertain_help') }}</span>
                  </span>
                  <span class="is-flagged" :title="t('teacher.playback_legend_flagged')">
                    {{ t('teacher.playback_legend_flagged_short') }}
                    <span class="visually-hidden">{{ t('teacher.playback_legend_flagged') }}</span>
                  </span>
                  <span class="is-skipped">{{ t('teacher.word_status_skipped') }}</span>
                </div>
              </div>
              </div>

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

              <section class="teacher-playback__section teacher-playback__ai" :aria-label="t('teacher.playback_wording_summary')">
                <h2>{{ t('teacher.playback_wording_summary') }}</h2>
                <p v-if="checkerScore" class="teacher-playback__score">{{ checkerScore }}</p>
                <p class="teacher-playback__hint">{{ t('teacher.playback_ai_wording_only') }}</p>
                <p v-if="hasAudio && !audioError" class="teacher-playback__hint">{{ t('teacher.playback_listen_first') }}</p>
                <p v-else-if="audioError" class="teacher-playback__hint">{{ t('teacher.playback_flags_failed') }}</p>
                <p v-else class="teacher-playback__hint">{{ t('teacher.playback_flags_unverified') }}</p>
                <div class="teacher-playback__summary" :aria-label="t('teacher.playback_wording_summary')">
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
                  <p v-else class="teacher-empty-line">{{ t('teacher.playback_no_assessment') }}</p>
                  <p v-if="assessedWords.length && unassessedWordCount" class="teacher-playback__hint">{{ unassessedWordCount }} · {{ t('teacher.playback_word_unassessed') }}</p>
                </div>
                <div v-if="hasAttention" class="teacher-playback__follow" :aria-label="t('teacher.playback_attention_title')">
                  <h3>{{ t('teacher.playback_attention_title') }}</h3>
                  <div v-if="summary.ayahs.length" class="teacher-playback__ayah-row">
                    <div class="teacher-playback__chips" :aria-label="t('teacher.playback_weak_ayahs')">
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
                        :class="[attentionTone(item), { 'is-current': item.key === activeKey, 'is-selected': item.key === selectedKey }]"
                        :aria-pressed="item.key === selectedKey"
                        :aria-label="attentionLabel(item)"
                        :disabled="Boolean(saving)"
                        @click="selectAttention(item)"
                      >
                        <span v-if="glyphForKey(item.key)" class="teacher-playback__arabic" lang="ar" dir="rtl" :style="{ fontFamily: glyphForKey(item.key).fontFamily }">{{ glyphForKey(item.key).text }}</span>
                        <span v-else>{{ item.ayah ? t('teacher.ayah_n', { n: item.ayah }) : t('teacher.unavailable') }}</span>
                      </button>
                    </li>
                  </ul>
                  <p v-else class="teacher-empty-line">{{ attentionEmpty }}</p>
                  <button v-if="filteredItems.length > visibleItems.length" type="button" class="teacher-playback__more" @click="showAllAttention = true">
                    {{ t('teacher.playback_show_all') }}
                  </button>
                </div>
                <details v-if="payload.history?.previous_review" class="teacher-playback__panel">
                  <summary>{{ t('teacher.playback_previous_review') }}</summary>
                  <p v-if="payload.history.previous_review.accuracy_percent != null" class="teacher-playback__hint">{{ t('teacher.playback_previous_wording', { n: payload.history.previous_review.accuracy_percent }) }}</p>
                  <p v-if="payload.history.previous_review.feedback">{{ payload.history.previous_review.feedback }}</p>
                  <ul v-if="observationLines(payload.history.previous_review.observations).length" class="teacher-playback__history">
                    <li v-for="line in observationLines(payload.history.previous_review.observations)" :key="line.id">{{ line.text }}</li>
                  </ul>
                </details>
              </section>

              <section class="teacher-playback__section teacher-playback__assessment" :aria-label="t('teacher.playback_teacher_assessment')">
                <h2>
                  {{ t('teacher.playback_teacher_assessment') }}
                  <span v-if="!soundEvidenceReady" class="teacher-playback__fold-state">{{ t('teacher.playback_sound_unverified') }}</span>
                </h2>
                <p class="teacher-playback__hint">{{ t('teacher.playback_teacher_assessment_help') }}</p>
                <p v-if="!soundEvidenceReady" class="teacher-playback__hint">{{ t('teacher.playback_sound_needs_evidence') }}</p>
                <label v-if="!soundEvidenceReady" class="teacher-playback__heard-live">
                  <input v-model="heardLive" type="checkbox" :disabled="Boolean(saving)" @change="assessmentDirty = true">
                  <span>{{ t('teacher.playback_heard_live') }}</span>
                </label>
                <div class="teacher-playback__ratings">
                  <label v-for="area in assessmentAreas" :key="area.id" class="teacher-playback__rating">
                    <span>{{ t(area.label) }}</span>
                    <select v-model="assessment[area.id].rating" class="form-select" :disabled="Boolean(saving)" @change="assessmentDirty = true">
                      <option value="">{{ t('teacher.assessment_rating_unset') }}</option>
                      <option value="needs_work">{{ t('teacher.assessment_needs_work') }}</option>
                      <option value="sound">{{ t('teacher.assessment_sound') }}</option>
                      <option value="strong">{{ t('teacher.assessment_strong') }}</option>
                    </select>
                  </label>
                </div>
                <label class="teacher-playback__field">
                  <span>{{ t('teacher.playback_general_feedback') }}</span>
                  <textarea v-model="assessmentGeneral" class="form-control" rows="2" maxlength="2000" :disabled="Boolean(saving)" :placeholder="t('teacher.playback_feedback_placeholder')" @input="assessmentDirty = true"></textarea>
                </label>
                <button type="button" class="btn btn-primary btn-sm" :disabled="Boolean(saving) || !assessmentReady" @click="saveAssessment">
                  {{ saving === 'assessment' ? t('teacher.saving') : t('teacher.playback_save_assessment') }}
                </button>

                <div v-if="selectedKey" class="teacher-playback__word" :aria-label="t('teacher.coaching_word')">
                  <h3>{{ t('teacher.coaching_word') }}</h3>
                  <p v-if="selectedGlyph.fontFamily" class="teacher-playback__glyph" lang="ar" dir="rtl" :style="{ fontFamily: selectedGlyph.fontFamily }">{{ selectedGlyph.text }}</p>
                  <p v-if="selectedReference || selectedWord || selectedCoaching" class="teacher-playback__selection-meta">
                    <template v-if="selectedReference">{{ selectedReference }}<br></template>
                    <span class="teacher-playback__ai-result">{{ t('teacher.coaching_ai') }}: {{ wordStatusLabel(selectedWord?.status || selectedCoaching?.ai?.status) }}</span>
                  </p>
                  <p v-if="selectedWord?.recognised || selectedCoaching?.ai?.recognised" class="teacher-playback__heard">
                    <span>{{ t('teacher.playback_heard') }}</span>
                    <span lang="ar" dir="rtl">{{ selectedWord?.recognised || selectedCoaching?.ai?.recognised }}</span>
                  </p>
                  <p v-if="selectedDecision" class="teacher-playback__saved">{{ selectedDecision }}</p>
                  <button v-if="canRepeatWord" type="button" class="btn btn-outline-secondary btn-sm" @click="repeatWord">
                    <i class="bi bi-play-fill" aria-hidden="true"></i>
                    {{ t('teacher.coaching_play_segment') }}
                  </button>
                  <div v-if="selectedNeedsAttention" class="teacher-playback__action-row">
                    <button type="button" class="btn btn-outline-secondary btn-sm" :disabled="Boolean(saving)" @click="saveWord('confirm')">{{ t('teacher.coaching_confirm') }}</button>
                    <button type="button" class="btn btn-outline-secondary btn-sm" :disabled="Boolean(saving)" @click="saveWord('dismiss')">{{ t('teacher.coaching_dismiss') }}</button>
                  </div>
                  <div class="teacher-playback__action-row">
                    <label class="teacher-playback__field">
                      <span>{{ t('teacher.finding_label') }}</span>
                      <select v-model="annotationFinding" :disabled="Boolean(saving)">
                        <option value="">{{ t('teacher.finding_unset') }}</option>
                        <option v-for="[id, key] in findingOptions" :key="id" :value="id">{{ t(key) }}</option>
                      </select>
                    </label>
                    <label class="teacher-playback__field">
                      <span>{{ t('teacher.focus_label') }}</span>
                      <select v-model="annotationFocus" :disabled="Boolean(saving)">
                        <option value="">{{ t('teacher.focus_unset') }}</option>
                        <option v-for="[id, key] in focusOptions" :key="id" :value="id">{{ t(key) }}</option>
                      </select>
                    </label>
                  </div>
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
                  <details class="teacher-playback__panel">
                    <summary>{{ t('teacher.playback_actions') }}</summary>
                    <div class="teacher-playback__action-row">
                      <button type="button" class="btn btn-outline-secondary btn-sm" :disabled="Boolean(saving)" @click="saveWord('reviewed')">{{ t('teacher.playback_mark_reviewed') }}</button>
                      <button type="button" class="btn btn-outline-secondary btn-sm" :disabled="Boolean(saving)" @click="saveWord('retry')">{{ t('teacher.coaching_request_retry') }}</button>
                    </div>
                    <div v-if="selectedCoaching?.corrections?.length">
                      <p class="teacher-playback__hint">{{ t('teacher.coaching_history') }}</p>
                      <ul class="teacher-playback__history">
                        <li v-for="item in selectedCoaching.corrections" :key="item.id">
                          <p v-if="item.focus || item.finding" class="teacher-playback__hint">{{ teacherFindingLabel(item) }}</p>
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
                          <button type="button" class="btn btn-link btn-sm" :disabled="Boolean(saving)" @click="editCorrection(item)">
                            {{ t('teacher.coaching_correct_note') }}
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
                </div>
              </section>

              <section class="teacher-playback__section teacher-playback__response" :aria-label="t('teacher.playback_feedback')">
                <h2>{{ t('teacher.playback_feedback') }}</h2>
                <p class="teacher-playback__hint">{{ t('teacher.playback_feedback_optional') }}</p>
                <div v-if="payload.review?.feedback" class="teacher-playback__saved-feedback">
                  <p v-if="payload.review.feedback.body" class="teacher-playback__saved">{{ payload.review.feedback.body }}</p>
                </div>
                <label class="teacher-playback__field">
                  <span class="visually-hidden">{{ t('teacher.playback_feedback') }}</span>
                  <textarea v-model="feedback" rows="2" maxlength="2000" :placeholder="t('teacher.playback_feedback_placeholder')" :disabled="Boolean(saving)"></textarea>
                </label>
                <div class="teacher-playback__action-row">
                  <TeacherVoiceNoteControls ref="voice" :disabled="Boolean(saving)" @state-change="voiceState = $event" />
                  <button type="button" class="btn btn-outline-secondary btn-sm" :disabled="Boolean(saving) || (!feedback.trim() && !voiceState.hasRecording) || voiceState.active" @click="sendFeedback">
                    <i class="bi bi-send" aria-hidden="true"></i>
                    {{ saving === 'feedback' ? t('teacher.saving') : t('teacher.playback_send_feedback') }}
                  </button>
                </div>
              </section>

              <section class="teacher-playback__section teacher-playback__revision" :aria-label="t('teacher.playback_revision_section')">
                <h2>{{ t('teacher.playback_revision_section') }}</h2>
                <p class="teacher-playback__hint">{{ t('teacher.playback_revision_optional') }}</p>
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
                <button type="button" class="btn btn-outline-secondary btn-sm" :disabled="Boolean(saving) || Boolean(payload.review?.revision) || !payload.suggested_revision || !dueAt || dueAt < today" @click="assignRevision">
                  <i class="bi bi-journal-check" aria-hidden="true"></i>
                  {{ saving === 'revision' ? t('teacher.saving') : t('teacher.playback_assign') }}
                </button>
                <p v-if="payload.review?.revision" class="teacher-playback__saved">{{ t('teacher.playback_revision_sent') }}<template v-if="assignedRevisionLabel"><br>{{ assignedRevisionLabel }}</template></p>
                <p v-if="followUpLabel" class="teacher-playback__hint">{{ followUpLabel }}</p>
              </section>
            </aside>
          </div>
    </div>
    <template #footer>
      <div v-if="payload && !loading" class="teacher-playback__review-status">
        <p v-if="queuePosition" class="teacher-playback__queue">{{ queuePosition }}</p>
        <p class="teacher-playback__review-copy">
          <strong>{{ reviewStatusHeading }}</strong>
          <template v-if="reviewedAtLabel"><br><span>{{ reviewedAtLabel }}</span></template>
        </p>
        <div class="teacher-playback__review-actions">
          <button type="button" class="btn btn-outline-secondary" :disabled="!hasPrevious || Boolean(saving) || moving || loading" @click="requestPrevious">
            {{ t('teacher.playback_previous') }}
          </button>
          <button type="button" class="btn btn-outline-secondary" :disabled="!hasNext || Boolean(saving) || moving || loading" @click="requestNext">
            {{ t('teacher.playback_next') }}
          </button>
          <button v-if="!reviewed" type="button" class="btn btn-primary teacher-playback__mark" :disabled="Boolean(saving) || voiceState.active || wordVoiceState.active" @click="completeReview">
            <i class="bi" :class="saving === 'review' ? 'bi-arrow-repeat' : 'bi-check2-circle'" aria-hidden="true"></i>
            {{ saving === 'review' ? t('teacher.saving') : t('teacher.playback_complete_review') }}
          </button>
          <span v-else class="teacher-playback__saved">{{ t('teacher.playback_follow_up') }}</span>
        </div>
        <div v-if="navPrompt" class="teacher-playback__nav-prompt" role="group" :aria-label="t('teacher.playback_unsaved_prompt')">
          <p>{{ t('teacher.playback_unsaved_prompt') }}</p>
          <p v-if="actionError" class="teacher-playback__alert" role="alert">{{ actionError }}</p>
          <div class="teacher-playback__nav-actions">
            <button ref="navSave" type="button" class="btn btn-primary btn-sm" :disabled="Boolean(saving)" @click="saveAndNext">{{ saving === 'next' ? t('teacher.saving') : t('teacher.playback_unsaved_save') }}</button>
            <button type="button" class="btn btn-outline-secondary btn-sm" :disabled="Boolean(saving)" @click="discardAndNext">{{ t('teacher.playback_unsaved_discard') }}</button>
            <button type="button" class="btn btn-outline-secondary btn-sm" :disabled="Boolean(saving)" @click="navPrompt = false">{{ t('teacher.playback_unsaved_cancel') }}</button>
          </div>
        </div>
      </div>
    </template>
  </TeacherDialog>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import { learningApi, createClientMessageId } from '../../scripts/api/learning'
import { ayahRangeLabel } from '../../scripts/teacher/formatters'
import { assignmentDisplayLabel } from '../../scripts/teacher/taskTypes'
import { normaliseTeacherWordStatus } from '../../scripts/teacher/wordReviewClass'
import { studioHasDraft, studioWordStatusKey, studioConfidenceValue } from '../../scripts/teacher/teacherStudioState'
import { TEACHER_FINDING_FOCI, TEACHER_FINDINGS } from '../../scripts/teacher/taskTypes'
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
import TeacherWordingMatch from './TeacherWordingMatch.vue'

let playbackUid = 0

export default {
  name: 'TeacherRecitationPlaybackReview',
  components: { TeacherAudioFeedbackPlayer, TeacherDialog, TeacherReciteMushafAyahs, TeacherVoiceNoteControls, TeacherWordingMatch },
  mixins: [i18nMixin],
  props: {
    open: { type: Boolean, default: false },
    studentId: { type: [Number, String], default: null },
    attemptId: { type: [Number, String], default: null },
    autoplay: { type: Boolean, default: false },
    focusAyah: { type: [Number, String], default: null },
    queue: { type: Array, default: () => [] },
  },
  emits: ['close', 'reviewed', 'navigate'],
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
      audioReady: false,
      assessment: {
        memorisation: { rating: '', note: '' },
        tajweed: { rating: '', note: '' },
        pronunciation: { rating: '', note: '' },
        fluency: { rating: '', note: '' },
      },
      assessmentAreas: [
        { id: 'memorisation', label: 'teacher.assessment_memorisation' },
        { id: 'tajweed', label: 'teacher.assessment_tajweed' },
        { id: 'pronunciation', label: 'teacher.assessment_pronunciation' },
        { id: 'fluency', label: 'teacher.assessment_fluency' },
      ],
      assessmentGeneral: '',
      assessmentDirty: false,
      heardLive: false,
      editingCorrectionId: null,
      voiceState: { hasRecording: false, active: false },
      wordVoiceState: { hasRecording: false, active: false },
      wordDrafts: {},
      wordStatusDrafts: {},
      wordMetaDrafts: {},
      playbackRate: 1,
      speeds: [0.5, 0.75, 1, 1.25],
      activeKey: '',
      selectedKey: '',
      selectedGlyph: { text: '', fontFamily: '' },
      repeatUntil: null,
      wordNote: '',
      wordStatus: '',
      annotationFinding: '',
      annotationFocus: '',
      findingOptions: TEACHER_FINDINGS,
      focusOptions: TEACHER_FINDING_FOCI,
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
      actionTimer: null,
      navPrompt: false,
      navDirection: 1,
      moving: false,
      queueScroll: false,
      queueSnapshot: [],
    }
  },
  computed: {
    hasUnsavedWork() {
      return studioHasDraft(this)
    },
    queueItems() {
      const seen = new Set()
      return (this.queue || []).map((item) => ({
        studentId: Number(item.studentId || item.student_id),
        attemptId: Number(item.attemptId || item.attempt_id),
      })).filter((item) => item.studentId > 0 && item.attemptId > 0 && !seen.has(item.attemptId) && seen.add(item.attemptId))
    },
    activeQueue() {
      return this.queueSnapshot.length ? this.queueSnapshot : this.queueItems
    },
    queueIndex() {
      return this.activeQueue.findIndex((item) => item.attemptId === Number(this.attemptId))
    },
    queuePosition() {
      if (!this.activeQueue.length || this.queueIndex < 0) return ''
      return this.t('teacher.playback_queue_position', { n: this.queueIndex + 1, total: this.activeQueue.length })
    },
    hasNext() {
      return this.queueIndex >= 0 && this.queueIndex < this.activeQueue.length - 1
    },
    hasPrevious() {
      return this.queueIndex > 0
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
      return Boolean(this.payload?.audio?.available && this.payload?.audio?.url)
    },
    soundEvidenceReady() {
      return (this.hasAudio && !this.audioError) || this.heardLive
    },
    assessmentReady() {
      if (this.assessmentGeneral.trim()) return true
      return this.assessmentAreas.some((area) => {
        const entry = this.assessment[area.id] || {}
        return Boolean(entry.rating || String(entry.note || '').trim())
      })
    },
    followUpLabel() {
      const followUp = this.payload?.review?.revision?.follow_up
      if (!followUp) return ''
      if (followUp.approved) return this.t('teacher.playback_follow_up_approved')
      if (followUp.submitted) return this.t('teacher.playback_follow_up_submitted')
      return this.t('teacher.playback_follow_up_open')
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
    attentionEmpty() {
      const key = {
        uncertain: 'teacher.playback_no_uncertain',
        skipped: 'teacher.playback_no_skipped',
      }[this.attentionFilter] || 'teacher.playback_no_flags'
      return this.t(key)
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
    reviewStatusHeading() {
      if (this.reviewed) return this.t('teacher.playback_status_reviewed')
      if (this.payload?.review?.revision) return this.t('teacher.playback_status_revision_open')
      return this.t('teacher.playback_status_needs_review')
    },
    reviewedAtLabel() {
      const value = this.payload?.review?.reviewed_at
      if (!value) return ''
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return ''
      return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
    },
    pendingFeedback() {
      return Boolean(this.feedback.trim() || this.voiceState.hasRecording)
    },
    pendingRevision() {
      if (!this.payload?.suggested_revision || this.payload?.review?.revision) return false
      return Boolean(this.revisionNote.trim() || (this.dueAt && this.initialDueAt && this.dueAt !== this.initialDueAt))
    },
    reviewLabel() {
      if (this.payload?.review?.revision) return this.t('teacher.recite_revision_requested')
      return this.reviewed ? this.t('teacher.playback_status_reviewed') : this.t('teacher.recite_status_pending')
    },
    reviewTone() {
      if (this.payload?.review?.revision) return 'is-partial'
      return this.reviewed ? 'is-score' : 'is-quiet'
    },
    feedbackPhrases() {
      return [
        this.t('teacher.playback_phrase_well_done'),
        this.t('teacher.playback_phrase_practise'),
        this.t('teacher.playback_phrase_focus'),
        this.t('teacher.playback_phrase_repeat'),
        this.t('teacher.playback_phrase_guidance'),
      ]
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
      const type = assignmentDisplayLabel(assignment, this.t.bind(this))
      return [type, ayahRangeLabel(assignment.surah_name, assignment.ayah_start, assignment.ayah_end, this.t)]
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
    showAssignmentPill() {
      const label = this.assignmentLabel
      return Boolean(label && label !== this.passageLabel && label.length <= 36)
    },
    scoreTone() {
      const score = Number(this.payload?.accuracy_percent)
      if (!Number.isFinite(score)) return 'is-quiet'
      if (this.hasAttention) return score >= 50 ? 'is-partial' : 'is-flagged'
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
    audioGap() {
      const reason = this.payload?.audio?.reason
      const title = {
        none: 'teacher.recording_state_not_recorded',
        expired: 'teacher.recording_state_expired',
        purged: 'teacher.recording_state_not_retained',
        missing: 'teacher.recording_state_unavailable',
      }[reason] || 'teacher.recording_state_unavailable'
      return { title: this.t(title), body: this.t('teacher.recording_unavailable_body') }
    },
    canRequestRecording() {
      return Boolean(this.payload?.suggested_revision && !this.payload?.review?.revision)
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
        this.captureQueue()
        this.load()
        window.addEventListener('keydown', this.onShortcut)
      } else {
        this.loadToken += 1
        window.removeEventListener('keydown', this.onShortcut)
        this.$refs.player?.pause()
      }
    },
    actionMessage(message) {
      window.clearTimeout(this.actionTimer)
      if (!message) return
      this.actionTimer = window.setTimeout(() => { this.actionMessage = '' }, 4000)
    },
    attemptId() {
      this.moving = false
      this.navPrompt = false
      if (this.open) this.load()
    },
    queue: {
      deep: true,
      handler() {
        if (!this.open) return
        if (this.queueItems.some((item) => item.attemptId === Number(this.attemptId))) this.captureQueue()
      },
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
    window.clearTimeout(this.actionTimer)
    this.$refs.player?.pause()
    window.removeEventListener('keydown', this.onShortcut)
  },
  methods: {
    areaNeedsEvidence(area) {
      return area?.id === 'tajweed' || area?.id === 'pronunciation'
    },
    assessmentState(area) {
      const rating = this.assessment?.[area.id]?.rating
      const labels = {
        needs_work: 'teacher.assessment_needs_work',
        sound: 'teacher.assessment_sound',
        strong: 'teacher.assessment_strong',
      }
      const label = this.t(labels[rating] || 'teacher.assessment_rating_unset')
      if (this.areaNeedsEvidence(area) && !this.soundEvidenceReady) {
        return rating ? `${label} · ${this.t('teacher.playback_sound_unverified')}` : this.t('teacher.playback_sound_unverified')
      }
      return label
    },
    revealWord(node, automatic = false) {
      if (!node) return
      const reading = this.$refs.readingPanel
      const mushaf = this.$refs.mushaf
      const desktop = window.matchMedia('(min-width: 961px)').matches
      const body = reading?.closest('.modal-body')
      if (automatic && !desktop && body) {
        const side = this.$refs.coachingPanel
        if (side?.contains(document.activeElement) || reading.getBoundingClientRect().bottom <= body.getBoundingClientRect().top) return
      }
      const scroller = mushaf || body
      if (!scroller) return
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
      const resetScroll = this.queueScroll
      this.queueScroll = false
      this.loading = true
      this.loadError = ''
      this.payload = null
      this.ayahs = []
      this.activeKey = ''
      this.selectedKey = ''
      this.selectedGlyph = { text: '', fontFamily: '' }
      this.repeatUntil = null
      this.wordNote = ''
      this.annotationFinding = ''
      this.annotationFocus = ''
      this.wordDrafts = {}
      this.wordStatusDrafts = {}
      this.wordMetaDrafts = {}
      this.$refs.voice?.discardRecording()
      this.$refs.wordVoice?.discardRecording()
      this.wordStatus = ''
      this.currentTime = 0
      this.duration = 0
      this.playing = false
      this.audioError = false
      this.audioReady = false
      this.assessmentDirty = false
      this.editingCorrectionId = null
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
        this.hydrateAssessment(payload)
        const counts = this.summary.counts
        this.attentionFilter = ['flagged', 'uncertain', 'skipped'].find(key => counts[key] > 0) || 'flagged'
        this.showAllAttention = false
        this.loading = false
        await this.loadMushaf(token)
        if (token !== this.loadToken) return
        if (resetScroll) {
          this.$nextTick(() => this.resetPlaybackScroll())
        } else {
          const focusAyah = Number(this.focusAyah)
          if (focusAyah > 0) this.$nextTick(() => this.selectAyah(focusAyah))
          else if (this.autoplay) this.$nextTick(() => this.togglePlayback())
        }
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
      this.audioReady = true
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
      if (this.selectedKey && this.selectedKey !== key) this.stashWordDraft()
      this.selectedKey = key
      this.selectedGlyph = {
        text: part?.isEnd ? '' : (part?.text || ''),
        fontFamily: part?.fontFamily || '',
        accessibleText: part?.accessibleText || '',
        ayah: part?.ayah,
      }
      this.applyWordDraft(key)
      const match = this.words.find((word) => wordKey(word) === key)
      const start = wordWindow(match)?.start ?? (Number.isFinite(part?.start) ? part.start : null)
      if (start != null) this.seekTo(start, this.hasAudio)
      this.$nextTick(() => this.revealCoachingField())
    },
    stashWordDraft() {
      const key = this.selectedKey
      if (!key) return
      this.wordDrafts[key] = this.wordNote
      this.wordStatusDrafts[key] = this.wordStatus
      this.wordMetaDrafts[key] = { finding: this.annotationFinding, focus: this.annotationFocus }
    },
    applyWordDraft(key) {
      const meta = this.wordMetaDrafts[key] || {}
      this.wordNote = this.wordDrafts[key] || ''
      this.wordStatus = this.wordStatusDrafts[key] || ''
      this.annotationFinding = meta.finding || ''
      this.annotationFocus = meta.focus || ''
    },
    revealCoachingField() {
      const panel = this.$refs.coachingPanel
      const card = panel?.querySelector('.teacher-playback__word')
      const field = card?.querySelector('textarea')
      const scroller = panel?.closest('.modal-body')
      if (!card || !scroller) return
      const bounds = scroller.getBoundingClientRect()
      const target = field || card
      const box = target.getBoundingClientRect()
      const padding = 16
      if (box.bottom > bounds.bottom - padding) scroller.scrollTop += box.bottom - bounds.bottom + padding
      else if (box.top < bounds.top + padding) scroller.scrollTop += box.top - bounds.top - padding
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
    usePhrase(phrase) {
      const current = this.feedback.trim()
      if (!current) {
        this.feedback = phrase
        return
      }
      if (current.includes(phrase)) return
      this.feedback = `${current} ${phrase}`
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
      if (action === 'correct' && Boolean(this.annotationFocus) !== Boolean(this.annotationFinding)) {
        this.actionError = this.t('teacher.finding_pair_required')
        this.actionMessage = ''
        return
      }
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
          focus: action === 'correct' ? this.annotationFocus : undefined,
          finding: action === 'correct' ? this.annotationFinding : undefined,
          review_status: action === 'status' ? this.wordStatus : undefined,
          due_at: action === 'practice' ? this.wordDueAt : undefined,
          correction_id: action === 'correct' ? this.editingCorrectionId || undefined : undefined,
        }, recording)
        this.applyPayload(payload)
        if (action === 'correct') {
          delete this.wordDrafts[this.selectedKey]
          delete this.wordMetaDrafts[this.selectedKey]
          this.wordNote = ''
          this.annotationFinding = ''
          this.annotationFocus = ''
          this.editingCorrectionId = null
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
    attentionTone(item) {
      if (item?.status === 'partial') return 'is-uncertain'
      if (item?.status === 'skipped' || item?.status === 'omitted') return 'is-skipped'
      if (item?.status === 'correct') return 'is-correct'
      return 'is-flagged'
    },
    teacherFindingLabel(item) {
      const finding = item?.finding ? this.t(`teacher.finding_${item.finding}`) : ''
      const focus = item?.focus ? this.t(`teacher.focus_${item.focus}`) : ''
      return [this.t('teacher.finding_teacher'), finding, focus].filter(Boolean).join(' · ')
    },
    hydrateAssessment(payload) {
      const saved = payload?.assessment?.observations || {}
      const next = {
        memorisation: { rating: '', note: '' },
        tajweed: { rating: '', note: '' },
        pronunciation: { rating: '', note: '' },
        fluency: { rating: '', note: '' },
      }
      for (const area of Object.keys(next)) {
        next[area] = {
          rating: saved[area]?.rating || '',
          note: saved[area]?.note || '',
        }
      }
      this.assessment = next
      this.assessmentGeneral = saved.general || ''
      this.heardLive = Boolean(saved.heard_live)
      this.assessmentDirty = false
    },
    observationLines(observations) {
      if (!observations || typeof observations !== 'object') return []
      return this.assessmentAreas.map((area) => {
        const entry = observations[area.id]
        if (!entry?.rating && !entry?.note) return null
        const rating = entry.rating ? this.t(`teacher.assessment_${entry.rating === 'needs_work' ? 'needs_work' : entry.rating}`) : ''
        return { id: area.id, text: [this.t(area.label), rating, entry.note].filter(Boolean).join(' · ') }
      }).filter(Boolean)
    },
    async saveAssessment() {
      if (this.saving || !this.assessmentReady) return
      const soundRating = this.assessmentAreas.some((area) => this.areaNeedsEvidence(area) && this.assessment[area.id]?.rating)
      if (soundRating && !this.soundEvidenceReady) {
        this.actionError = this.t('teacher.playback_sound_needs_evidence')
        this.actionMessage = ''
        return
      }
      this.saving = 'assessment'
      this.actionError = ''
      this.actionMessage = ''
      const body = { general: this.assessmentGeneral.trim() || null, heard_live: this.heardLive }
      for (const area of this.assessmentAreas) {
        const entry = this.assessment[area.id] || {}
        body[area.id] = {
          rating: entry.rating || null,
          note: String(entry.note || '').trim() || null,
        }
      }
      try {
        const data = await learningApi.saveTeacherRecitationAssessment(this.studentId, this.attemptId, body)
        if (data?.playback) this.applyPayload(data.playback)
        else if (data?.assessment) this.payload = { ...this.payload, assessment: data.assessment }
        this.hydrateAssessment(this.payload)
        this.actionMessage = this.t('teacher.playback_assessment_saved')
      } catch (err) {
        this.actionError = this.failureMessage(err)
      } finally {
        this.saving = ''
      }
    },
    editCorrection(item) {
      if (!item?.id) return
      this.editingCorrectionId = item.id
      this.wordNote = item.body || ''
      this.annotationFinding = item.finding || ''
      this.annotationFocus = item.focus || ''
    },
    async sendFeedback() {
      if (this.saving) return
      if (this.$refs.voice?.isRecordingActive) return
      if (!this.pendingFeedback) {
        this.actionError = this.t('teacher.playback_feedback_required')
        this.actionMessage = ''
        return
      }
      this.saving = 'feedback'
      this.actionError = ''
      this.actionMessage = ''
      const saved = await this.persistFeedback()
      if (saved) this.actionMessage = this.t('teacher.playback_feedback_sent')
      this.saving = ''
    },
    async persistFeedback() {
      const recording = this.$refs.voice?.recordingPayload?.() || null
      const body = this.feedback.trim()
      if (!body && !recording?.blob) return true
      if (!this.feedbackRequest || this.feedbackRequest.body !== body || this.feedbackRequest.blob !== recording?.blob) {
        this.feedbackRequest = { body, blob: recording?.blob, id: createClientMessageId() }
      }
      try {
        const payload = await learningApi.saveTeacherRecitationFeedback(this.studentId, this.attemptId, {
          body,
          client_message_id: this.feedbackRequest.id,
        }, recording)
        this.applyPayload(payload)
        this.feedback = ''
        this.feedbackRequest = null
        this.$refs.voice?.discardRecording()
        return true
      } catch (err) {
        this.actionError = this.failureMessage(err)
        this.actionMessage = ''
        return false
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
    requestAnotherRecording() {
      if (!this.canRequestRecording) return
      if (!this.revisionNote.trim()) this.revisionNote = this.t('teacher.recording_request_note')
      this.$nextTick(() => {
        document.querySelector('.teacher-dialog.teacher-playback-studio .teacher-playback__revision textarea')?.focus()
      })
    },
    async assignRevision() {
      if (this.saving || this.payload?.review?.revision || !this.payload?.suggested_revision || !this.dueAt || this.dueAt < this.today) return
      this.saving = 'revision'
      this.actionError = ''
      this.actionMessage = ''
      const saved = await this.persistRevision()
      if (saved) this.actionMessage = this.t('teacher.playback_revision_sent')
      this.saving = ''
    },
    async persistRevision() {
      if (this.payload?.review?.revision) return true
      const pending = Boolean(this.revisionNote.trim() || (this.dueAt && this.initialDueAt && this.dueAt !== this.initialDueAt))
      if (!pending) return true
      if (!this.payload?.suggested_revision || !this.dueAt || this.dueAt < this.today) {
        this.actionError = this.t('teacher.playback_revision_unsaved')
        this.actionMessage = ''
        return false
      }
      try {
        const payload = await learningApi.assignTeacherRecitationRevision(this.studentId, this.attemptId, {
          due_at: this.dueAt,
          feedback: this.revisionNote.trim() || undefined,
        })
        this.applyPayload(payload)
        this.revisionNote = ''
        this.initialDueAt = this.dueAt
        return true
      } catch (err) {
        this.actionError = this.failureMessage(err)
        this.actionMessage = ''
        return false
      }
    },
    resetPlaybackScroll() {
      const dialog = document.querySelector('.teacher-dialog.teacher-playback-studio')
      if (!dialog) return
      dialog.querySelectorAll('.modal-body, .teacher-playback__main, .teacher-playback__side, .teacher-playback__mushaf').forEach((node) => {
        node.scrollTop = 0
      })
    },
    requestPrevious() {
      this.requestMove(-1)
    },
    requestNext() {
      this.requestMove(1)
    },
    requestMove(direction) {
      const allowed = direction < 0 ? this.hasPrevious : this.hasNext
      if (!allowed || this.saving || this.moving || this.loading) return
      this.navDirection = direction
      if (this.hasUnsavedWork) {
        this.navPrompt = true
        this.$nextTick(() => this.$refs.navSave?.focus())
        return
      }
      this.moveQueue(direction)
    },
    async saveAndNext() {
      const direction = this.navDirection || 1
      const allowed = direction < 0 ? this.hasPrevious : this.hasNext
      if (this.saving || this.moving || !allowed) return
      this.saving = 'next'
      this.actionError = ''
      this.actionMessage = ''
      const saved = await this.savePendingWork()
      this.saving = ''
      if (!saved) return
      this.navPrompt = false
      this.moveQueue(direction)
    },
    discardAndNext() {
      const direction = this.navDirection || 1
      const allowed = direction < 0 ? this.hasPrevious : this.hasNext
      if (this.saving || !allowed) return
      this.discardDrafts()
      this.navPrompt = false
      this.actionError = ''
      this.moveQueue(direction)
    },
    discardDrafts() {
      this.feedback = ''
      this.feedbackRequest = null
      this.privateNote = ''
      this.revisionNote = ''
      this.dueAt = this.initialDueAt || this.defaultDue()
      this.wordNote = ''
      this.wordStatus = ''
      this.annotationFinding = ''
      this.annotationFocus = ''
      this.wordDrafts = {}
      this.wordStatusDrafts = {}
      this.wordMetaDrafts = {}
      this.wordDueAt = this.initialWordDueAt || this.dueAt
      this.$refs.voice?.discardRecording()
      this.$refs.wordVoice?.discardRecording()
      this.voiceState = { hasRecording: false, active: false }
      this.wordVoiceState = { hasRecording: false, active: false }
    },
    async savePendingWork() {
      if (this.voiceState.active || this.wordVoiceState.active || this.$refs.voice?.isRecordingActive || this.$refs.wordVoice?.isRecordingActive) {
        this.actionError = this.t('teacher.playback_finish_recording')
        this.actionMessage = ''
        return false
      }
      if (this.pendingFeedback) {
        const savedFeedback = await this.persistFeedback()
        if (!savedFeedback) return false
      }
      if (this.pendingRevision) {
        const savedRevision = await this.persistRevision()
        if (!savedRevision) return false
      }
      const note = this.privateNote.trim()
      if (note) {
        try {
          const payload = await learningApi.saveTeacherRecitationPrivateNote(this.studentId, this.attemptId, note)
          this.applyPayload(payload)
          this.privateNote = ''
        } catch (err) {
          this.actionError = this.failureMessage(err)
          this.actionMessage = ''
          return false
        }
      }
      if (studioHasDraft(this)) {
        this.actionError = this.t('teacher.playback_word_unsaved')
        this.actionMessage = ''
        return false
      }
      return true
    },
    captureQueue() {
      this.queueSnapshot = this.queueItems
    },
    moveToNext() {
      this.moveQueue(1)
    },
    moveQueue(direction) {
      const next = this.activeQueue[this.queueIndex + direction]
      if (!next) return
      this.moving = true
      this.navPrompt = false
      this.queueScroll = true
      this.$refs.player?.pause()
      this.$emit('navigate', next)
      this.$nextTick(() => {
        if (Number(this.attemptId) !== next.attemptId) this.moving = false
      })
    },
    async completeReview() {
      if (this.saving || this.reviewed) return
      this.navPrompt = false
      if (this.voiceState.active || this.wordVoiceState.active || this.$refs.voice?.isRecordingActive) {
        this.actionError = this.t('teacher.playback_finish_recording')
        this.actionMessage = ''
        return
      }
      this.saving = 'review'
      this.actionError = ''
      this.actionMessage = ''
      try {
        if (this.pendingFeedback) {
          const savedFeedback = await this.persistFeedback()
          if (!savedFeedback) return
        }
        if (this.pendingRevision) {
          const savedRevision = await this.persistRevision()
          if (!savedRevision) return
        }
        const payload = await learningApi.markTeacherRecitationReviewed(this.studentId, this.attemptId)
        this.applyPayload(payload)
        this.actionMessage = this.t('teacher.playback_reviewed_saved')
        this.$emit('reviewed')
      } catch (err) {
        this.actionError = this.failureMessage(err)
      } finally {
        this.saving = ''
      }
    },
    markReviewed() {
      return this.completeReview()
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
