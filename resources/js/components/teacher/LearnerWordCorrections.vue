<template>
  <section v-if="items.length" class="learner-word-corrections" :aria-label="t('teacher.coaching_student_title')">
    <h3>{{ t('teacher.coaching_student_title') }}</h3>
    <ul>
      <li v-for="item in items" :key="item.id">
        <div class="learner-word-corrections__head">
          <strong>{{ item.surah_name }} · {{ t('teacher.ayah_n', { n: item.ayah }) }}</strong>
          <span>{{ statusLabel(item.review_status) }}</span>
        </div>
        <MadaniAyahSnippet :surah="item.surah_number" :ayah="item.ayah" :focus-index="item.word_index" inline />
        <article v-for="correction in item.corrections" :key="correction.id" class="learner-word-corrections__note">
          <p v-if="correction.focus || correction.finding" class="learner-word-corrections__teacher">{{ teacherFindingLabel(correction) }}</p>
          <p v-if="correction.body">{{ correction.body }}</p>
          <TeacherAudioFeedbackPlayer
            v-if="correction.audio?.available && correction.audio?.url"
            :src="correction.audio.url"
            :duration-ms="correction.audio.duration_ms"
            compact
          />
        </article>
        <div v-if="item.original_audio?.available && item.original_audio?.url" class="learner-word-corrections__clip">
          <span>{{ t('teacher.coaching_your_recording') }}</span>
          <audio
            :ref="(node) => setClip(item.id, node)"
            :src="item.original_audio.url"
            preload="none"
            @timeupdate="onClipTime(item)"
          ></audio>
          <button type="button" @click="playClip(item)">{{ clipPlaying === item.id ? t('teacher.pause_recording') : t('teacher.coaching_listen_repeat') }}</button>
        </div>
        <a v-if="item.practise_again?.href" class="learner-word-corrections__again" :href="item.practise_again.href">{{ t('teacher.coaching_practise_again') }}</a>
      </li>
    </ul>
  </section>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import MadaniAyahSnippet from './MadaniAyahSnippet.vue'
import TeacherAudioFeedbackPlayer from './TeacherAudioFeedbackPlayer.vue'

export default {
  name: 'LearnerWordCorrections',
  components: { MadaniAyahSnippet, TeacherAudioFeedbackPlayer },
  mixins: [i18nMixin],
  props: {
    items: { type: Array, default: () => [] },
  },
  data() {
    return {
      clips: {},
      clipPlaying: null,
      clipStop: null,
    }
  },
  methods: {
    setClip(id, node) {
      if (node) this.clips[id] = node
    },
    teacherFindingLabel(correction) {
      const finding = correction.finding ? this.t(`teacher.finding_${correction.finding}`) : ''
      const focus = correction.focus ? this.t(`teacher.focus_${correction.focus}`) : ''
      return [this.t('teacher.finding_teacher'), finding, focus].filter(Boolean).join(' · ')
    },
    statusLabel(status) {
      if (status === 'awaiting_retry') return this.t('teacher.coaching_status_awaiting')
      if (status === 'needs_practice') return this.t('teacher.coaching_status_practice')
      if (status === 'improved') return this.t('teacher.coaching_status_improved')
      if (status === 'resolved') return this.t('teacher.coaching_status_resolved')
      return this.t('teacher.coaching_student_title')
    },
    async playClip(item) {
      const audio = this.clips[item.id]
      if (!audio) return
      if (this.clipPlaying === item.id && !audio.paused) {
        audio.pause()
        this.clipPlaying = null
        this.clipStop = null
        return
      }
      const start = Number(item.segment?.start)
      const end = Number(item.segment?.end)
      this.clipStop = Number.isFinite(end) && (!Number.isFinite(start) || end >= start) ? end : null
      if (Number.isFinite(start) && start >= 0) audio.currentTime = start
      try {
        await audio.play()
        this.clipPlaying = item.id
      } catch {
        this.clipPlaying = null
      }
    },
    onClipTime(item) {
      const audio = this.clips[item.id]
      if (!audio || this.clipPlaying !== item.id || this.clipStop == null) return
      if (audio.currentTime >= this.clipStop) {
        audio.pause()
        this.clipPlaying = null
        this.clipStop = null
      }
    },
  },
}
</script>
