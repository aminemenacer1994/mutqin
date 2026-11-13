<template>
  <article
    class="ach-badge"
    :class="[
      `ach-badge--${tone}`,
      `ach-badge--${item.state || 'locked'}`,
      { 'is-path-locked': isPathLocked },
    ]"
    :aria-label="ariaLabel"
  >
    <AchievementBadgeArt
      :item="item"
      size="lg"
      :muted="item.state === 'locked'"
    />
    <div class="ach-badge__body">
      <h3 class="ach-badge__title">{{ title }}</h3>
      <p v-if="meaning" class="ach-badge__desc">{{ meaning }}</p>
      <div v-if="showProgress" class="ach-badge__progress" role="group" :aria-label="progressAria">
        <div class="ach-badge__meter" aria-hidden="true">
          <span class="ach-badge__meter-fill" :style="{ width: `${percent}%` }"></span>
        </div>
        <p class="ach-badge__progress-text">
          <span>{{ progressLabel }}</span>
          <span v-if="percent != null" class="ach-badge__pct">{{ percent }}%</span>
        </p>
      </div>
      <p v-else-if="item.state === 'unlocked' && unlockLabel" class="ach-badge__unlocked">
        {{ unlockLabel }}
      </p>
      <p v-else-if="requirement" class="ach-badge__req">{{ requirement }}</p>
    </div>
  </article>
</template>

<script>
import { achievementTone, formatUnlockDate } from './achievementMeta.js'
import AchievementBadgeArt from './AchievementBadgeArt.vue'

export default {
  name: 'AchievementBadgeCard',
  components: { AchievementBadgeArt },
  props: {
    item: { type: Object, required: true },
    locale: { type: String, default: 'en' },
    title: { type: String, required: true },
    description: { type: String, required: true },
    progressLabel: { type: String, default: '' },
    requirement: { type: String, default: '' },
    unlockPrefix: { type: String, default: '' },
  },
  computed: {
    tone() {
      return achievementTone(this.item?.id)
    },
    isPathLocked() {
      return this.item?.detail === 'path_locked' || this.item?.path_open === false
    },
    meaning() {
      // Path-locked cards only need the “unlock previous first” line.
      if (this.isPathLocked) return ''
      return this.description
    },
    percent() {
      if (this.item?.percent == null) return null
      return Math.max(0, Math.min(100, Number(this.item.percent) || 0))
    },
    showProgress() {
      return this.item?.state === 'in_progress' && (this.item?.target || 0) > 0
    },
    unlockLabel() {
      const date = formatUnlockDate(this.item?.unlocked_at, this.locale)
      if (!date) return this.unlockPrefix || ''
      return this.unlockPrefix ? `${this.unlockPrefix} ${date}` : date
    },
    progressAria() {
      return this.progressLabel || this.title
    },
    ariaLabel() {
      const parts = [this.title, this.meaning]
      if (this.showProgress && this.progressLabel) parts.push(this.progressLabel)
      if (this.item?.state === 'unlocked' && this.unlockLabel) parts.push(this.unlockLabel)
      if (this.item?.state === 'locked' && this.requirement) parts.push(this.requirement)
      return parts.filter(Boolean).join('. ')
    },
  },
}
</script>
