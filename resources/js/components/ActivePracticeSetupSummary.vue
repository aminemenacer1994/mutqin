<template>
  <section
    class="active-practice-setup"
    :class="[
      `active-practice-setup--${mode}`,
      {
        'is-expanded': expanded,
        'is-empty-optional': setup.emptyOptional,
        'is-mobile': compactMobile,
      },
    ]"
    :aria-label="setup.title"
  >
    <header class="active-practice-setup__head">
      <div class="active-practice-setup__titles">
        <p class="active-practice-setup__kicker">{{ setup.title }}</p>
        <p v-if="restoredNotice" class="active-practice-setup__restored" role="status">
          {{ restoredNotice }}
        </p>
      </div>
      <button
        v-if="mode === 'compact' && canOpenDrawer"
        type="button"
        class="active-practice-setup__open"
        @click="$emit('open-tools')"
      >
        <span>{{ openToolsLabel }}</span>
        <i class="bi bi-sliders" aria-hidden="true"></i>
      </button>
    </header>

    <div v-if="mode === 'confirm'" class="active-practice-setup__confirm">
      <h3 class="active-practice-setup__confirm-title">{{ setup.confirmation.title }}</h3>
      <ul class="active-practice-setup__confirm-list">
        <li v-for="row in setup.confirmation.rows" :key="row.id">
          <span class="active-practice-setup__confirm-label">{{ row.label }}</span>
          <strong class="active-practice-setup__confirm-value">{{ row.value }}</strong>
        </li>
      </ul>
      <div class="active-practice-setup__confirm-actions">
        <button type="button" class="active-practice-setup__btn active-practice-setup__btn--primary" @click="$emit('confirm-start')">
          {{ setup.confirmation.primaryLabel }}
        </button>
        <button type="button" class="active-practice-setup__btn active-practice-setup__btn--secondary" @click="$emit('adjust-tools')">
          {{ setup.confirmation.secondaryLabel }}
        </button>
      </div>
    </div>

    <template v-else>
      <p v-if="setup.emptyOptional && mode !== 'compact'" class="active-practice-setup__empty">
        {{ setup.emptyLabel }}
      </p>

      <ul
        class="active-practice-setup__chips"
        :aria-label="setup.title"
      >
        <li
          v-for="item in visibleItems"
          :key="item.id"
          class="active-practice-setup__chip"
          :class="[`is-${item.state}`, { 'is-recommended': item.recommended && item.state === 'recommended' }]"
          :title="item.tooltip || item.description"
        >
          <i class="bi" :class="item.icon" aria-hidden="true"></i>
          <span class="active-practice-setup__chip-label">{{ item.shortValue || item.label }}</span>
          <span class="active-practice-setup__chip-state">{{ item.stateLabel }}</span>
          <span
            v-if="item.recommended"
            class="active-practice-setup__recommended"
          >{{ item.recommendedLabel }}</span>
        </li>
        <li v-if="showOverflow" class="active-practice-setup__chip is-more">
          <button type="button" class="active-practice-setup__more-btn" @click="toggleExpanded">
            {{ expanded ? collapseLabel : setup.overflowLabel }}
          </button>
        </li>
      </ul>

      <div v-if="expanded || mode === 'full'" class="active-practice-setup__details">
        <article
          v-for="item in detailItems"
          :key="`detail-${item.id}`"
          class="active-practice-setup__detail"
          :class="[`is-${item.state}`]"
        >
          <div class="active-practice-setup__detail-head">
            <i class="bi" :class="item.icon" aria-hidden="true"></i>
            <div>
              <h4>{{ item.label }}</h4>
              <p class="active-practice-setup__detail-value">{{ item.value }}</p>
            </div>
            <span class="active-practice-setup__detail-state">{{ item.stateLabel }}</span>
          </div>
          <p v-if="item.explanation || item.description" class="active-practice-setup__detail-copy">
            {{ item.explanation || item.description }}
          </p>
          <p v-if="item.recommended && item.recommendedReason" class="active-practice-setup__detail-why">
            {{ item.recommendedReason }}
          </p>
          <p
            v-if="item.canChangeDuringSession && item.canChangeDuringSession.allowed === false"
            class="active-practice-setup__detail-lock"
          >
            {{ item.canChangeDuringSession.reason }}
          </p>
          <p
            v-else-if="item.canChangeDuringSession && item.canChangeDuringSession.warn"
            class="active-practice-setup__detail-warn"
          >
            {{ item.canChangeDuringSession.reason }}
          </p>
        </article>
      </div>

      <p
        v-if="primaryExplanation && mode === 'compact' && !expanded"
        class="active-practice-setup__live-explain"
        role="status"
      >
        {{ primaryExplanation }}
      </p>
    </template>
  </section>
</template>

<script>
export default {
  name: 'ActivePracticeSetupSummary',
  props: {
    setup: {
      type: Object,
      required: true,
    },
    mode: {
      type: String,
      default: 'compact', // compact | full | confirm
    },
    canOpenDrawer: {
      type: Boolean,
      default: true,
    },
    openToolsLabel: {
      type: String,
      default: 'Practice tools',
    },
    collapseLabel: {
      type: String,
      default: 'Show less',
    },
    restoredNotice: {
      type: String,
      default: '',
    },
    compactMobile: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['open-tools', 'confirm-start', 'adjust-tools'],
  data() {
    return {
      expanded: false,
    }
  },
  computed: {
    visibleItems() {
      if (this.mode === 'full' || this.expanded) {
        return (this.setup.items || []).filter((item) => (
          item.state === 'active_now'
          || item.state === 'selected'
          || item.state === 'paused'
          || item.state === 'completed'
          || item.state === 'recommended'
        ))
      }
      return this.setup.compactItems || []
    },
    detailItems() {
      return (this.setup.items || []).filter((item) => (
        item.state === 'active_now'
        || item.state === 'selected'
        || item.state === 'paused'
        || item.state === 'completed'
        || item.state === 'recommended'
      ))
    },
    showOverflow() {
      return this.mode === 'compact' && Number(this.setup.overflowCount || 0) > 0
    },
    primaryExplanation() {
      const list = this.setup.explanations || []
      return list[0] || ''
    },
  },
  methods: {
    toggleExpanded() {
      this.expanded = !this.expanded
    },
  },
}
</script>
