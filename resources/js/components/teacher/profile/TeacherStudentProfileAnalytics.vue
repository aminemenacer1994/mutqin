<template>
  <div class="teacher-analytics">
    <p class="dash-section__hint">{{ t('teacher.analytics_hint') }}</p>

    <div class="dash-glance__stats teacher-glance">
      <article class="dash-glance-stat">
        <span class="dash-glance-stat__icon" aria-hidden="true"><i class="bi bi-play-circle"></i></span>
        <span class="dash-glance-stat__copy">
          <span class="dash-glance-stat__value">{{ metric('sessions') }}</span>
          <span class="dash-glance-stat__label">{{ t('teacher.sessions') }}</span>
        </span>
      </article>
      <article class="dash-glance-stat">
        <span class="dash-glance-stat__icon" aria-hidden="true"><i class="bi bi-clock-history"></i></span>
        <span class="dash-glance-stat__copy">
          <span class="dash-glance-stat__value">{{ practiceTime }}</span>
          <span class="dash-glance-stat__label">{{ t('teacher.practice_time') }}</span>
        </span>
      </article>
      <article class="dash-glance-stat">
        <span class="dash-glance-stat__icon" aria-hidden="true"><i class="bi bi-calendar3"></i></span>
        <span class="dash-glance-stat__copy">
          <span class="dash-glance-stat__value">{{ metric('active_days') }}</span>
          <span class="dash-glance-stat__label">{{ t('teacher.active_days') }}</span>
        </span>
      </article>
      <article class="dash-glance-stat">
        <span class="dash-glance-stat__icon" aria-hidden="true"><i class="bi bi-mic"></i></span>
        <span class="dash-glance-stat__copy">
          <span class="dash-glance-stat__value">{{ score }}</span>
          <span class="dash-glance-stat__label">{{ t('teacher.ai_rate') }}</span>
        </span>
      </article>
    </div>

    <p v-if="daysLine" class="teacher-analytics__line">{{ daysLine }}</p>

    <dl v-if="nowOn" class="teacher-facts teacher-facts--single">
      <div>
        <dt>{{ t('teacher.now_on') }}</dt>
        <dd>{{ nowOn }}</dd>
      </div>
    </dl>

    <section v-if="weak.length" class="teacher-analytics__block">
      <h3 class="teacher-subhead">{{ t('teacher.tab_weak') }}</h3>
      <p class="dash-section__hint">{{ t('teacher.analytics_weak_hint') }}</p>
      <ul class="teacher-mini-list">
        <li v-for="item in visibleWeak" :key="item.id">
          <strong>{{ item.surah_name }} {{ item.ayah_number }}</strong>
          <span>{{ t('teacher.times', { n: item.affected_attempt_count }) }}</span>
        </li>
      </ul>
      <TeacherMore :remaining="weak.length - shownWeak" :shown="shownWeak" :initial="STEP" @more="shownWeak += STEP" @less="shownWeak = STEP" />
    </section>

    <section v-if="sessions.length" class="teacher-analytics__block">
      <h3 class="teacher-subhead">{{ t('teacher.tab_practice') }}</h3>
      <p class="dash-section__hint">{{ t('teacher.analytics_practice_hint') }}</p>
      <ul class="teacher-mini-list">
        <li v-for="session in visibleSessions" :key="session.id">
          <strong>{{ sessionLabel(session) }}</strong>
          <span>{{ formatWhen(session.last_activity_at) }}</span>
        </li>
      </ul>
      <TeacherMore :remaining="sessions.length - shownSessions" :shown="shownSessions" :initial="STEP" @more="shownSessions += STEP" @less="shownSessions = STEP" />
    </section>

  </div>
</template>

<script>
import { i18nMixin } from '../../../mixins/i18nMixin'
import TeacherMore from '../TeacherMore.vue'

const STEP = 3

export default {
  name: 'TeacherStudentProfileAnalytics',
  components: { TeacherMore },
  mixins: [i18nMixin],
  props: {
    profile: { type: Object, required: true },
    metric: { type: Function, required: true },
    practiceTime: { type: String, required: true },
    sessionLabel: { type: Function, required: true },
    formatWhen: { type: Function, required: true },
  },
  data() {
    return {
      shownWeak: STEP,
      shownSessions: STEP,
      STEP,
    }
  },
  computed: {
    sessions() {
      return this.profile.payload?.sessions || []
    },
    weak() {
      return this.profile.payload?.weak || []
    },
    visibleWeak() {
      return this.weak.slice(0, this.shownWeak)
    },
    visibleSessions() {
      return this.sessions.slice(0, this.shownSessions)
    },
    score() {
      const rate = this.profile.payload?.success_rate ?? this.profile.payload?.metrics?.ai_success_rate
      return typeof rate === 'number' ? this.t('teacher.score_n', { n: rate }) : this.t('teacher.unavailable')
    },
    nowOn() {
      const saved = this.profile.payload?.latest_saved
      return saved ? this.sessionLabel(saved) : ''
    },
    daysLine() {
      const days = (this.profile.payload?.calendar || []).filter((day) => day.active).length
      if (!days) return ''
      return this.t('teacher.analytics_days_n', { n: days })
    },
  },
}
</script>
