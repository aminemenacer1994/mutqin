<template>
  <div class="ach-panel">
    <section
      v-for="tier in visibleTiers"
      :key="tier.id"
      class="ach-panel__tier"
      :class="{ 'is-closed': !tier.open }"
      :aria-labelledby="`ach-tier-${tier.id}`"
    >
      <header class="ach-panel__tier-head">
        <div class="ach-panel__tier-copy">
          <h3 :id="`ach-tier-${tier.id}`">{{ tierTitle(tier) }}</h3>
          <p v-if="tierHint(tier)">{{ tierHint(tier) }}</p>
        </div>
        <span class="ach-panel__tier-count">{{ tierCount(tier) }}</span>
      </header>
      <div class="ach-panel__grid" role="list">
        <AchievementBadgeCard
          v-for="item in sortedItems(tier)"
          :key="item.id"
          role="listitem"
          :item="item"
          :locale="locale"
          :title="nameFor(item)"
          :description="descriptionFor(item)"
          :meaning="resolveMeaning(item)"
          :status-label="resolveStatus(item)"
          :progress-label="progressFor(item)"
          :requirement="requirementFor(item)"
          :unlock-prefix="unlockPrefix"
        />
      </div>
    </section>

    <button
      v-if="hasMoreTiers"
      type="button"
      class="dash-btn dash-btn--ghost ach-panel__more"
      :aria-expanded="showMore ? 'true' : 'false'"
      @click="showMore = !showMore"
    >
      {{ showMore ? showLessLabel : showMoreLabel }}
    </button>
  </div>
</template>

<script>
import AchievementBadgeCard from './AchievementBadgeCard.vue'

export default {
  name: 'AchievementsPanel',
  components: { AchievementBadgeCard },
  props: {
    items: { type: Array, default: () => [] },
    tiers: { type: Array, default: () => [] },
    locale: { type: String, default: 'en' },
    showMoreLabel: { type: String, default: 'Show more' },
    showLessLabel: { type: String, default: 'Show less' },
    nameFor: { type: Function, required: true },
    descriptionFor: { type: Function, required: true },
    meaningFor: { type: Function, required: true },
    statusFor: { type: Function, required: true },
    progressFor: { type: Function, required: true },
    requirementFor: { type: Function, required: true },
    tierTitleFor: { type: Function, required: true },
    tierHintFor: { type: Function, required: true },
    unlockPrefix: { type: String, default: '' },
  },
  data() {
    return {
      showMore: false,
      autoExpanded: false,
    }
  },
  computed: {
    tierGroups() {
      if (Array.isArray(this.tiers) && this.tiers.length) {
        return this.tiers.map((tier) => ({
          ...tier,
          items: Array.isArray(tier.items) ? tier.items : [],
        }))
      }
      const order = ['beginner', 'intermediate', 'advanced']
      const map = {}
      ;(Array.isArray(this.items) ? this.items : []).forEach((item) => {
        const id = item?.tier || 'beginner'
        if (!map[id]) {
          map[id] = {
            id,
            open: true,
            unlocked_count: 0,
            total_count: 0,
            complete: false,
            items: [],
          }
        }
        map[id].items.push(item)
        map[id].total_count += 1
        if (item.state === 'unlocked') map[id].unlocked_count += 1
      })
      order.forEach((id) => {
        if (!map[id]) return
        map[id].complete = map[id].unlocked_count >= map[id].total_count && map[id].total_count > 0
        map[id].open = true
      })
      return order.map((id) => map[id]).filter(Boolean)
    },
    hasMoreTiers() {
      return this.tierGroups.length > 1
    },
    beginnerComplete() {
      const beginner = this.tierGroups.find((tier) => tier.id === 'beginner')
      return !!beginner?.complete
    },
    nextOutsideBeginner() {
      return this.tierGroups.slice(1).some((tier) =>
        (tier.items || []).some((item) => item.is_next || item.state === 'in_progress')
      )
    },
    visibleTiers() {
      if (this.showMore) return this.tierGroups
      return this.tierGroups.slice(0, 1)
    },
  },
  watch: {
    tierGroups: {
      immediate: true,
      handler() {
        if (this.autoExpanded) return
        if (this.beginnerComplete || this.nextOutsideBeginner) {
          this.showMore = true
          this.autoExpanded = true
        }
      },
    },
  },
  methods: {
    tierTitle(tier) {
      return this.tierTitleFor(tier)
    },
    tierHint(tier) {
      return this.tierHintFor(tier) || ''
    },
    tierCount(tier) {
      return `${tier.unlocked_count || 0} / ${tier.total_count || 0}`
    },
    sortedItems(tier) {
      const items = Array.isArray(tier?.items) ? [...tier.items] : []
      const rank = (item) => {
        if (item.is_next) return 0
        if (item.state === 'in_progress') return 1
        if (item.state === 'unlocked') return 2
        return 3
      }
      items.sort((a, b) => {
        const ra = rank(a)
        const rb = rank(b)
        if (ra !== rb) return ra - rb
        return (a.sort || 0) - (b.sort || 0)
      })
      return items
    },
    resolveMeaning(item) {
      return this.meaningFor(item) || ''
    },
    resolveStatus(item) {
      return this.statusFor(item) || ''
    },
  },
}
</script>
