<template>
  <article
    class="ach-badge"
    :class="[
      `ach-badge--${tone}`,
      `ach-badge--${item.state || 'locked'}`,
      { 'is-next': !!item.is_next },
      { 'is-path-locked': isPathLocked },
    ]"
    :aria-label="ariaLabel"
  >
    <AchievementBadgeArt
      :item="item"
      size="lg"
      :muted="item.state === 'locked' && !item.is_next"
    />
    <div class="ach-badge__body">
      <span v-if="statusLabel" class="ach-badge__status" :class="statusClass">{{ statusLabel }}</span>
      <h3 class="ach-badge__title">{{ title }}</h3>
      <p v-if="bodyText" class="ach-badge__desc">{{ bodyText }}</p>
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
    meaning: { type: String, default: '' },
    statusLabel: { type: String, default: '' },
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
    statusClass() {
      if (this.item?.is_next) return 'ach-badge__status--next'
      return `ach-badge__status--${this.item?.state || 'locked'}`
    },
    bodyText() {
      if (this.isPathLocked) return ''
      if (this.item?.state === 'unlocked') return this.meaning || this.description
      if (this.item?.state === 'in_progress' || this.item?.is_next) {
        return this.meaning || this.description
      }
      return this.meaning || this.description
    },
    percent() {
      if (this.item?.percent == null) return null
      return Math.max(0, Math.min(100, Number(this.item.percent) || 0))
    },
    showProgress() {
      if (this.item?.state === 'unlocked') return false
      if ((this.item?.target || 0) <= 0) return false
      if (this.item?.state === 'in_progress') return true
      return !!this.item?.is_next && (this.item?.current || 0) > 0
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
      const parts = [this.statusLabel, this.title, this.bodyText]
      if (this.showProgress && this.progressLabel) parts.push(this.progressLabel)
      if (this.item?.state === 'unlocked' && this.unlockLabel) parts.push(this.unlockLabel)
      if (this.item?.state === 'locked' && this.requirement) parts.push(this.requirement)
      return parts.filter(Boolean).join('. ')
    },
  },
}
</script>
