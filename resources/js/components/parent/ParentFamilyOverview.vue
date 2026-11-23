<template>
  <section class="parent-home" aria-labelledby="parent-overview-heading">
    <header class="parent-page">
      <span class="parent-page__icon" aria-hidden="true"><i class="bi bi-house-heart"></i></span>
      <div>
        <h1 id="parent-overview-heading">{{ t('parent.greeting', { name: firstName }) }}</h1>
        <p>{{ t('parent.home_lead') }}</p>
      </div>
    </header>

    <TeacherEmpty v-if="!children.length" illustrated icon="bi bi-people" :message="t('parent.children_empty')" />

    <template v-else>
      <section v-if="attention.length" class="parent-attention" :aria-label="t('parent.attention_title')">
        <h2><i class="bi bi-bell" aria-hidden="true"></i>{{ t('parent.attention_title') }}</h2>
        <ul>
          <li v-for="item in attention" :key="item.id">
            <button type="button" @click="openAttention(item)">
              <i :class="item.icon" aria-hidden="true"></i>
              <span>
                <strong>{{ item.name }}</strong>
                <small>{{ item.detail }}</small>
              </span>
              <em>{{ item.action }}</em>
            </button>
          </li>
        </ul>
      </section>
      <p v-else class="parent-ok"><i class="bi bi-check-circle" aria-hidden="true"></i>{{ t('parent.home_ok') }}</p>

      <ul class="parent-child-grid">
        <li v-for="(child, index) in children" :key="child.id" class="parent-child-card" :style="{ '--parent-i': index }">
          <button type="button" class="parent-child-card__main" @click="$emit('open-child', child.id)">
            <span class="parent-avatar" aria-hidden="true">{{ initial(child.name) }}</span>
            <span class="parent-child-card__copy">
              <strong>{{ child.name }}</strong>
              <small>{{ teacherLine(child) }}</small>
              <span class="parent-status" :class="`is-${statusFor(child).tone}`">
                <i :class="statusFor(child).icon" aria-hidden="true"></i>
                {{ statusFor(child).text }}
              </span>
            </span>
            <i class="bi bi-chevron-right parent-child-card__go" aria-hidden="true"></i>
          </button>
          <div class="parent-child-card__actions">
            <button type="button" @click="$emit('open-learning', child.id)">
              <i class="bi bi-journal-check" aria-hidden="true"></i>{{ t('parent.home_homework') }}
            </button>
            <button type="button" @click="$emit('open-progress', child.id)">
              <i class="bi bi-graph-up-arrow" aria-hidden="true"></i>{{ t('parent.home_progress') }}
            </button>
            <button type="button" @click="$emit('open-messages', child.id)">
              <i class="bi bi-chat-heart" aria-hidden="true"></i>{{ t('parent.home_message') }}
            </button>
          </div>
        </li>
      </ul>
    </template>
  </section>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import { activityName, initial, passageLabel } from '../../scripts/parent/dashboard'
import TeacherEmpty from '../teacher/TeacherEmpty.vue'

export default {
  name: 'ParentFamilyOverview',
  components: { TeacherEmpty },
  mixins: [i18nMixin],
  props: {
    firstName: { type: String, required: true },
    children: { type: Array, default: () => [] },
    homework: { type: Array, default: () => [] },
    messageUnread: { type: Number, default: 0 },
  },
  emits: ['open-child', 'open-learning', 'open-messages', 'open-progress'],
  computed: {
    attention() {
      const items = []
      const unread = Number(this.messageUnread || 0)
      if (unread > 0) {
        items.push({
          id: 'unread-messages',
          kind: 'messages',
          icon: 'bi bi-chat-heart',
          name: this.t('parent.attention_messages_name'),
          detail: unread === 1 ? this.t('parent.attention_messages_one') : this.t('parent.attention_messages', { count: unread }),
          action: this.t('parent.attention_open_messages'),
        })
      }
      this.homework.forEach((row) => {
        if (!row.overdue || items.length >= 3) return
        const task = [activityName(this.t, row.activity), passageLabel(row)].filter(Boolean).join(' · ')
        items.push({
          id: `overdue-${row.id}`,
          kind: 'overdue',
          icon: 'bi bi-clock',
          childId: row.child_id,
          name: row.child_name,
          detail: task || this.t('parent.homework_overdue'),
          action: this.t('parent.attention_open_homework'),
        })
      })
      return items.slice(0, 3)
    },
  },
  methods: {
    initial,
    teacherLine(child) {
      return child.teachers?.[0]?.name || this.t('parent.teachers_empty')
    },
    statusFor(child) {
      if (!child.permissions?.assignments) {
        return { tone: 'quiet', icon: 'bi bi-lock', text: this.t('parent.child_private') }
      }
      const attention = Number(child.assignments?.needs_attention || 0)
      const active = Number(child.assignments?.active || 0)
      if (attention > 0) {
        return {
          tone: 'late',
          icon: 'bi bi-exclamation-circle',
          text: attention === 1 ? this.t('parent.child_late_one') : this.t('parent.child_late', { count: attention }),
        }
      }
      if (active > 0) {
        return {
          tone: 'open',
          icon: 'bi bi-journal-text',
          text: active === 1 ? this.t('parent.child_open_one') : this.t('parent.child_open', { count: active }),
        }
      }
      return { tone: 'ok', icon: 'bi bi-check-circle', text: this.t('parent.child_caught_up') }
    },
    openAttention(item) {
      if (item.kind === 'messages') {
        this.$emit('open-messages', null)
        return
      }
      this.$emit('open-learning', item.childId)
    },
  },
}
</script>
