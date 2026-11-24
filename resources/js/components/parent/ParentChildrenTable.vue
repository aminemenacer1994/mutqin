<template>
  <div class="parent-children-table-wrap">
    <table v-if="!loading && rows.length" class="parent-children-table">
      <thead>
        <tr>
          <th scope="col">{{ t('parent.table_child') }}</th>
          <th scope="col">{{ t('parent.table_teacher') }}</th>
          <th scope="col">{{ t('parent.table_assignment') }}</th>
          <th scope="col">{{ t('parent.table_due') }}</th>
          <th scope="col"><span class="visually-hidden">{{ t('parent.table_actions') }}</span></th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(child, index) in rows"
          :key="child.id"
          class="parent-children-table__row"
          :style="{ '--parent-i': index }"
          @click="$emit('open-profile', child.id)"
        >
          <td class="parent-children-table__child" data-label="">
            <span class="parent-children-table__main">
              <span class="parent-avatar" aria-hidden="true">{{ initial(child.name) }}</span>
              <span class="parent-children-table__name">{{ child.name }}</span>
              <i class="bi bi-chevron-right parent-children-table__go" aria-hidden="true"></i>
            </span>
          </td>
          <td class="parent-children-table__teacher" :data-label="t('parent.table_teacher')">
            {{ teacherName(child) }}
          </td>
          <td class="parent-children-table__assignment" :data-label="t('parent.table_assignment')">
            {{ assignmentLine(child) || t('parent.table_assignment_empty') }}
          </td>
          <td class="parent-children-table__due" :data-label="t('parent.table_due')">
            <span class="parent-status" :class="dueBadge(child).className">
              <i v-if="dueBadge(child).icon" :class="dueBadge(child).icon" aria-hidden="true"></i>
              {{ dueBadge(child).text }}
            </span>
          </td>
          <td class="parent-children-table__actions" :data-label="t('parent.table_actions')" @click.stop>
            <div class="parent-children-table__actions-inner">
              <button
                type="button"
                class="parent-children-table__action"
                :aria-label="t('parent.home_homework')"
                @click.stop="$emit('open-learning', child.id)"
              >
                <i class="bi bi-journal-check" aria-hidden="true"></i>
              </button>
              <button
                type="button"
                class="parent-children-table__action"
                :aria-label="t('parent.home_progress')"
                @click.stop="$emit('open-progress', child.id)"
              >
                <i class="bi bi-graph-up-arrow" aria-hidden="true"></i>
              </button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>

    <table v-else-if="loading" class="parent-children-table parent-children-table--skeleton" aria-busy="true">
      <thead>
        <tr>
          <th scope="col">{{ t('parent.table_child') }}</th>
          <th scope="col">{{ t('parent.table_teacher') }}</th>
          <th scope="col">{{ t('parent.table_assignment') }}</th>
          <th scope="col">{{ t('parent.table_due') }}</th>
          <th scope="col"><span class="visually-hidden">{{ t('parent.table_actions') }}</span></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="n in 3" :key="n" class="parent-children-table__row parent-children-table__row--skeleton">
          <td colspan="5"><div class="teacher-skeleton parent-children-table__skeleton"></div></td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import { initial, learningLabel } from '../../scripts/parent/dashboard'
import { childHomeworkPill, homeworkForChild, isDueThisWeek } from '../../scripts/parent/homeDashboard'

export default {
  name: 'ParentChildrenTable',
  mixins: [i18nMixin],
  props: {
    rows: { type: Array, default: () => [] },
    homework: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
  },
  emits: ['open-learning', 'open-progress', 'open-profile'],
  methods: {
    initial,
    teacherName(child) {
      const teacher = child.teachers?.[0]?.name
      return teacher || this.t('parent.teachers_empty')
    },
    assignmentLine(child) {
      if (!child.permissions?.progress) return ''
      return learningLabel(this.t, child.learning) || ''
    },
    dueBadge(child) {
      if (!child.permissions?.assignments) {
        return { className: 'is-quiet', icon: '', text: this.t('parent.child_none_due') }
      }
      const dueWeek = homeworkForChild(this.homework, child.id).filter((row) => isDueThisWeek(row)).length
      if (dueWeek > 0) {
        const pill = childHomeworkPill(this.t, child, this.homework)
        return { className: `is-${pill.tone}`, icon: pill.icon, text: pill.text }
      }
      return { className: 'is-quiet', icon: '', text: this.t('parent.child_none_due') }
    },
  },
}
</script>