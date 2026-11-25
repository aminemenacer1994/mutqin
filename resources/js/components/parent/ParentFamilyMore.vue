<template>
  <section class="parent-home parent-more-page teacher-stack">
    <header class="teacher-page-header">
      <div>
        <p class="teacher-kicker">{{ t('parent.workspace_label') }}</p>
        <h1 class="teacher-page-header__title">{{ t('parent.nav_more') }}</h1>
        <p class="teacher-page-header__hint">{{ t('parent.more_lead') }}</p>
      </div>
    </header>

    <div class="parent-more-grid" role="list">
      <button
        v-for="tile in tiles"
        :key="tile.id"
        type="button"
        class="parent-more-tile"
        role="listitem"
        @click="$emit('open', tile.id)"
      >
        <span class="parent-more-tile__icon" aria-hidden="true"><i :class="tile.icon"></i></span>
        <span class="parent-more-tile__copy">
          <strong>{{ t(tile.label) }}</strong>
          <small>{{ t(tile.hint) }}</small>
        </span>
        <span v-if="tile.badge" class="teacher-nav__badge">{{ tile.badge }}</span>
      </button>
    </div>
  </section>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'

export default {
  name: 'ParentFamilyMore',
  mixins: [i18nMixin],
  props: {
    childrenCount: { type: Number, default: 0 },
    attentionCount: { type: Number, default: 0 },
  },
  emits: ['open'],
  computed: {
    tiles() {
      const attention = Number(this.attentionCount || 0)
      return [
        {
          id: 'children',
          label: 'parent.nav_children',
          hint: 'parent.more_children_hint',
          icon: 'bi bi-people',
          badge: this.childrenCount > 0 ? String(this.childrenCount) : '',
        },
        {
          id: 'learning',
          label: 'parent.nav_learning',
          hint: 'parent.more_learning_hint',
          icon: 'bi bi-journal-check',
          badge: attention > 0 ? String(attention) : '',
        },
        {
          id: 'reports',
          label: 'parent.nav_reports',
          hint: 'parent.more_reports_hint',
          icon: 'bi bi-calendar2-heart',
          badge: '',
        },
        {
          id: 'settings',
          label: 'parent.nav_settings',
          hint: 'parent.more_settings_hint',
          icon: 'bi bi-gear',
          badge: '',
        },
      ]
    },
  },
}
</script>