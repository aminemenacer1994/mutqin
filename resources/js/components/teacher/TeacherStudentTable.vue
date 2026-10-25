<template>
  <div class="teacher-table-shell" :class="{ 'is-compact': compact }">
    <div class="teacher-student-cards" role="list" :aria-label="t('teacher.nav_students')">
      <article v-for="student in students" :key="`mobile-${student.id}`" class="teacher-student-card" :class="rowClasses(student)" role="listitem">
        <button type="button" class="teacher-student-card__main" :aria-label="rowLabel(student)" @click="$emit('open', student.id)">
          <span class="teacher-table__avatar" aria-hidden="true">{{ initial(student.name) }}</span>
          <span class="teacher-student-card__identity">
            <strong>{{ student.name }}</strong>
            <span>{{ lastSeen(student) }}</span>
          </span>
          <i class="bi bi-chevron-right" aria-hidden="true"></i>
        </button>
        <dl class="teacher-student-card__metrics">
          <div><dt>{{ t('teacher.sessions_recorded') }}</dt><dd>{{ sessions(student) }}</dd></div>
          <div><dt>{{ t('teacher.ai_check_average') }}</dt><dd>{{ score(student) }}</dd></div>
        </dl>
        <div class="teacher-student-card__follow-up">
          <span>{{ t('teacher.follow_up_reason') }}</span>
          <strong v-if="concern(student)" :class="`is-${concern(student).tone}`"><i :class="concern(student).icon" aria-hidden="true"></i>{{ concern(student).label }}</strong>
          <strong v-else>{{ t('teacher.none') }}</strong>
        </div>
        <div class="teacher-student-card__actions">
          <button type="button" class="btn btn-outline-secondary btn-sm" @click="$emit('assign', student)">
            <i class="bi bi-journal-plus" aria-hidden="true"></i><span class="teacher-student-card__assign-label">{{ t('teacher.assign_short') }}</span>
          </button>
          <button type="button" class="btn btn-primary btn-sm" @click="$emit('open', student.id)">
            {{ t('teacher.open_profile') }}
          </button>
        </div>
      </article>
    </div>
    <div v-if="hasOverflow" class="teacher-table-scrollbar" role="group" :aria-label="t('teacher.table_scroll_controls')">
      <span>{{ t('teacher.table_scroll_hint') }}</span>
      <div class="teacher-table-scrollbar__actions">
        <button type="button" :aria-label="t('teacher.table_scroll_left')" @click="scrollTable(-1)"><i class="bi bi-arrow-left" aria-hidden="true"></i></button>
        <button type="button" :aria-label="t('teacher.table_scroll_right')" @click="scrollTable(1)"><i class="bi bi-arrow-right" aria-hidden="true"></i></button>
      </div>
    </div>
  <div ref="tableWrap" class="table-responsive teacher-table-wrap" role="region" :aria-label="t('teacher.student_table_region')" tabindex="0">
    <table class="table align-middle mb-0 teacher-table teacher-table--students" :aria-label="t('teacher.nav_students')">
      <thead class="table-light">
        <tr>
          <th scope="col"><i class="bi bi-person me-1" aria-hidden="true"></i>{{ t('teacher.col_name') }}</th>
          <th scope="col"><i class="bi bi-clock-history me-1" aria-hidden="true"></i>{{ t('teacher.last') }}</th>
          <th scope="col" class="text-end"><i class="bi bi-journal-check me-1" aria-hidden="true"></i>{{ t('teacher.sessions_recorded') }}</th>
          <th scope="col" class="text-end"><i class="bi bi-stars me-1" aria-hidden="true"></i>{{ t('teacher.ai_check_average') }}</th>
          <th scope="col"><i class="bi bi-globe2 me-1" aria-hidden="true"></i>{{ t('teacher.follow_up_reason') }}</th>
          <th scope="col" class="text-end">{{ t('teacher.student_actions') }}</th>
        </tr>
      </thead>
      <tbody>
      <tr
        v-for="student in students"
        :key="student.id"
        class="teacher-table__row"
        :class="rowClasses(student)"
        tabindex="0"
        role="row"
        :aria-label="rowLabel(student)"
        @click="$emit('open', student.id)"
        @keydown.enter.prevent="$emit('open', student.id)"
        @keydown.space.prevent="$emit('open', student.id)"
      >
        <td class="teacher-table__cell teacher-table__cell--name">
          <span class="teacher-table__avatar" aria-hidden="true">{{ initial(student.name) }}</span>
          <span class="teacher-table__identity">
            <span class="teacher-table__name">{{ student.name }}</span>
            <span class="teacher-table__mobile-meta">
              <span><i class="bi bi-journal-check" aria-hidden="true"></i>{{ sessions(student) }} {{ t('teacher.sessions') }}</span>
              <span><i class="bi bi-stars" aria-hidden="true"></i>{{ score(student) }}</span>
            </span>
          </span>
        </td>
        <td class="teacher-table__cell teacher-table__cell--meta">
          {{ lastSeen(student) }}
        </td>
        <td class="teacher-table__cell teacher-table__cell--num text-end">
          <span class="teacher-table__metric">
            <strong>{{ sessions(student) }}</strong>
            <small>{{ t('teacher.sessions') }}</small>
          </span>
        </td>
        <td class="teacher-table__cell teacher-table__cell--num text-end">
          <span class="badge rounded-pill teacher-table__score" :class="scoreClass(student)"><i class="bi bi-stars me-1" aria-hidden="true"></i>{{ score(student) }}</span>
        </td>
        <td class="teacher-table__cell teacher-table__cell--concern">
          <span v-if="concern(student)" class="teacher-table__concern" :class="`is-${concern(student).tone}`">
            <i :class="concern(student).icon" class="me-1" aria-hidden="true"></i>
            {{ concern(student).label }}
          </span>
          <span v-else class="teacher-table__quiet">{{ t('teacher.none') }}</span>
        </td>
        <td class="teacher-table__cell teacher-table__cell--actions text-end">
          <span class="teacher-table__actions">
            <button
              type="button"
              class="teacher-table__action"
              :aria-label="t('teacher.assign_revision_for', { name: student.name })"
              :title="t('teacher.assign_revision')"
              @click.stop="$emit('assign', student)"
            >
              <i class="bi bi-journal-plus" aria-hidden="true"></i>
              <span class="teacher-table__action-label">{{ t('teacher.assign_short') }}</span>
            </button>
            <button
              type="button"
              class="teacher-table__action teacher-table__action--primary"
              :aria-label="t('teacher.open_profile_for', { name: student.name })"
              :title="t('teacher.open_profile')"
              @click.stop="$emit('open', student.id)"
            >
              <span class="teacher-table__action-label">{{ t('teacher.open') }}</span>
            </button>
          </span>
        </td>
      </tr>
      </tbody>
    </table>
  </div>
  </div>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import { attentionReasonTags, scoreBadgeTone, studentInitial } from '../../scripts/teacher/formatters'

export default {
  name: 'TeacherStudentTable',
  mixins: [i18nMixin],
  props: {
    students: { type: Array, default: () => [] },
    formatWhen: { type: Function, required: true },
    compact: { type: Boolean, default: false },
  },
  emits: ['open', 'assign'],
  data() {
    return { hasOverflow: false }
  },
  mounted() {
    this.updateOverflow()
    window.addEventListener('resize', this.updateOverflow, { passive: true })
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.updateOverflow)
  },
  updated() {
    this.$nextTick(this.updateOverflow)
  },
  methods: {
    initial: studentInitial,
    lastSeen(student) {
      return student.last_activity_at ? this.formatWhen(student.last_activity_at) : this.t('teacher.no_activity')
    },
    sessions(student) {
      const n = student.sessions
      return n === null || n === undefined ? '—' : String(n)
    },
    score(student) {
      const rate = student.ai_success_rate
      if (typeof rate !== 'number') return this.t('teacher.no_scored_checks')
      const count = Number(student.ai_attempts || 0)
      return `${rate}% · ${count} ${count === 1 ? this.t('teacher.check_one') : this.t('teacher.check_many')}`
    },
    scoreClass(student) {
      const rate = student.ai_success_rate
      if (typeof rate !== 'number') return ''
      return `teacher-table__score--${scoreBadgeTone(rate)}`
    },
    rowClasses(student) {
      const concern = this.concern(student)
      const tone = typeof student.ai_success_rate === 'number'
        ? scoreBadgeTone(student.ai_success_rate)
        : 'muted'
      return [
        concern ? `is-${concern.tone}` : 'is-quiet',
        `is-performance-${tone}`,
      ]
    },
    weak(student) {
      if (!student.weak_count) return '—'
      if (student.weak_example?.surah_name) {
        return `${student.weak_example.surah_name} ${student.weak_example.ayah_number}`
      }
      return String(student.weak_count)
    },
    concern(student) {
      return attentionReasonTags(student, this.t)[0] || null
    },
    rowLabel(student) {
      const concern = this.concern(student)?.label
      return [student.name, this.score(student), this.lastSeen(student), concern].filter(Boolean).join(', ')
    },
    scrollTable(direction) {
      const wrap = this.$refs.tableWrap
      if (!wrap) return
      wrap.scrollBy({ left: direction * Math.max(240, wrap.clientWidth * 0.65), behavior: 'smooth' })
    },
    updateOverflow() {
      const wrap = this.$refs.tableWrap
      this.hasOverflow = Boolean(wrap && wrap.scrollWidth > wrap.clientWidth + 2)
    },
  },
}
</script>
