<template>
  <section class="parent-home">
    <header class="parent-page">
      <span class="parent-page__icon" aria-hidden="true"><i class="bi bi-people"></i></span>
      <div>
        <h1>{{ t('parent.nav_children') }}</h1>
        <p>{{ t('parent.children_hint') }}</p>
      </div>
    </header>
    <div class="parent-filters">
      <ParentChildFilter :children="allChildren" :selected-id="selectedId" @select="$emit('select-child', $event)" />
    </div>
    <TeacherEmpty v-if="!children.length" illustrated icon="bi bi-people" :message="t('parent.children_empty')" />
    <ul v-else class="parent-child-grid">
      <li v-for="(child, index) in children" :key="child.id" class="parent-child-card" :style="{ '--parent-i': index }">
        <button type="button" class="parent-child-card__main" @click="$emit('open-profile', child.id)">
          <span class="parent-avatar" aria-hidden="true">{{ initial(child.name) }}</span>
          <span class="parent-child-card__copy">
            <strong>{{ child.name }}</strong>
            <small>{{ teacherLine(child) }}</small>
            <span class="parent-status is-quiet">
              <i class="bi bi-book" aria-hidden="true"></i>
              {{ learningLabel(t, child.learning) || t('parent.learning_empty') }}
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
  </section>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import { initial, learningLabel } from '../../scripts/parent/dashboard'
import ParentChildFilter from './ParentChildFilter.vue'
import TeacherEmpty from '../teacher/TeacherEmpty.vue'

export default {
  name: 'ParentFamilyChildren',
  components: { ParentChildFilter, TeacherEmpty },
  mixins: [i18nMixin],
  props: {
    children: { type: Array, default: () => [] },
    allChildren: { type: Array, default: () => [] },
    selectedId: { type: Number, default: null },
  },
  emits: ['select-child', 'open-learning', 'open-progress', 'open-profile', 'open-messages'],
  methods: {
    initial,
    learningLabel,
    teacherLine(child) {
      return child.teachers?.[0]?.name || this.t('parent.teachers_empty')
    },
  },
}
</script>
