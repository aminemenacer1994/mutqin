<template>
  <div class="teacher-table-shell" :class="{ 'is-compact': compact }">
    <div class="teacher-student-cards" role="list" :aria-label="t('teacher.nav_students')">
      <article v-for="student in students" :key="`mobile-${student.id}`" class="teacher-student-card" :class="rowClasses(student)" role="listitem">
        <button type="button" class="teacher-student-card__main" :aria-label="rowLabel(student)" @click="$emit('open', student.id)">
          <span class="teacher-table__avatar" aria-hidden="true">{{ initial(student.name) }}</span>
          <span class="teacher-student-card__identity">
            <strong>{{ student.name }}</strong>
          </span>
          <i class="bi bi-chevron-right" aria-hidden="true"></i>
        </button>
        <dl class="teacher-student-card__metrics">
          <div><dt>{{ t('teacher.ai_check_average') }}</dt><dd :title="scoreHelp(student)">{{ score(student) }}</dd></div>
        </dl>
        <div class="teacher-student-card__follow-up">
          <span>{{ t('teacher.follow_up_reason') }}</span>
          <strong v-if="concern(student)" :class="`is-${concern(student).tone}`"><i :class="concern(student).icon" aria-hidden="true"></i>{{ concern(student).label }}</strong>
          <strong v-else>{{ t('teacher.none') }}</strong>
        </div>
        <div class="teacher-student-card__actions">
          <span class="teacher-student-card__last">{{ t('teacher.last') }}: {{ lastSeen(student) }}</span>
          <button type="button" class="btn btn-outline-secondary btn-sm" @click="$emit('assign', student)">
            <i class="bi bi-journal-plus" aria-hidden="true"></i><span class="teacher-student-card__assign-label">{{ t('teacher.assign_short') }}</span>
          </button>
          <button type="button" class="btn btn-outline-danger btn-sm" :aria-label="t('teacher.delete_student_for', { name: student.name })" :title="t('teacher.delete_student')" @click="$emit('delete', student)">
            <i class="bi bi-trash" aria-hidden="true"></i>
          </button>
          <button type="button" class="btn btn-primary btn-sm" :aria-label="t('teacher.open_profile_for', { name: student.name })" :title="t('teacher.open_profile')" @click="$emit('open', student.id)">
            <i class="bi bi-arrow-up-right" aria-hidden="true"></i>
          </button>
        </div>
      </article>
    </div>
    <div v-if="hasOverflow" class="teacher-table-scrollbar" role="group" :aria-label="t('teacher.table_scroll_controls')">
      <span>{{ t('teacher.table_scroll_hint') }}</span>
      <div class="teacher-table-scrollbar__actions">
        <button type="button" :aria-label="t('teacher.table_scroll_left')" :disabled="!canScrollLeft" @click="scrollTable(-1)"><i class="bi bi-arrow-left" aria-hidden="true"></i></button>
        <button type="button" :aria-label="t('teacher.table_scroll_right')" :disabled="!canScrollRight" @click="scrollTable(1)"><i class="bi bi-arrow-right" aria-hidden="true"></i></button>
      </div>
    </div>
  <div ref="tableWrap" class="table-responsive teacher-table-wrap" role="region" :aria-label="t('teacher.student_table_region')" tabindex="0" @scroll.passive="updateOverflow">
    <table class="table align-middle mb-0 teacher-table teacher-table--students" :aria-label="t('teacher.nav_students')">
      <thead class="table-light">
        <tr>
          <th scope="col">{{ t('teacher.col_name') }}</th>
          <th scope="col" class="text-center">{{ t('teacher.ai_check_average') }}</th>
          <th scope="col" class="text-center">{{ t('teacher.follow_up_reason') }}</th>
          <th scope="col">{{ t('teacher.last') }}</th>
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
              <span>{{ score(student) }}</span>
            </span>
          </span>
        </td>
        <td class="teacher-table__cell teacher-table__cell--num text-center">
          <span class="badge rounded-pill teacher-table__score" :class="scoreClass(student)" :title="scoreHelp(student)" :aria-label="`${score(student)}. ${scoreHelp(student)}`">{{ score(student) }}</span>
        </td>
        <td class="teacher-table__cell teacher-table__cell--concern">
          <span v-if="concern(student)" class="teacher-table__concern" :class="`is-${concern(student).tone}`">
            {{ concern(student).label }}
          </span>
          <span v-else class="teacher-table__quiet">{{ t('teacher.none') }}</span>
        </td>
        <td class="teacher-table__cell teacher-table__cell--meta">{{ lastSeen(student) }}</td>
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
              class="teacher-table__action teacher-table__action--danger"
              :aria-label="t('teacher.delete_student_for', { name: student.name })"
              :title="t('teacher.delete_student')"
              @click.stop="$emit('delete', student)"
            >
              <i class="bi bi-trash" aria-hidden="true"></i>
              <span class="visually-hidden">{{ t('teacher.delete_student') }}</span>
            </button>
            <button
              type="button"
              class="teacher-table__action teacher-table__action--primary"
              :aria-label="t('teacher.open_profile_for', { name: student.name })"
              :title="t('teacher.open_profile')"
              @click.stop="$emit('open', student.id)"
            >
              <i class="bi bi-arrow-up-right" aria-hidden="true"></i>
              <span class="visually-hidden">{{ t('teacher.open') }}</span>
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
  emits: ['open', 'assign', 'delete'],
  data() {
    return { hasOverflow: false, canScrollLeft: false, canScrollRight: false }
  },
  mounted() {
    this.updateOverflow()
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(this.updateOverflow)
      if (this.$refs.tableWrap) this.resizeObserver.observe(this.$refs.tableWrap)
    }
    window.addEventListener('resize', this.updateOverflow, { passive: true })
  },
  beforeUnmount() {
    this.resizeObserver?.disconnect()
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
    scoreHelp(student) {
      const count = Number(student.ai_attempts || 0)
      return count ? this.t('teacher.ai_check_tooltip', { n: count }) : this.t('teacher.no_scored_checks')
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
      const maxScroll = wrap ? Math.max(0, wrap.scrollWidth - wrap.clientWidth) : 0
      this.hasOverflow = maxScroll > 2
      this.canScrollLeft = Boolean(wrap && wrap.scrollLeft > 2)
      this.canScrollRight = Boolean(wrap && wrap.scrollLeft < maxScroll - 2)
    },
  },
}
</script>
