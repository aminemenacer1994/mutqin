<template>
  <article
    ref="cardRef"
    class="walkthrough-card"
    :class="{ 'walkthrough-card--featured': featured }"
    :data-video-id="resolvedVideoId"
  >
    <button
      type="button"
      class="walkthrough-card__hit"
      :aria-label="`${t('howItWorksPage.watchVideo')}: ${title}`"
      @click="openModal"
    >
      <div class="walkthrough-card__media">
        <img
          v-if="!imageFailed && image"
          class="walkthrough-card__image"
          :src="image"
          :alt="imageAlt || title"
          width="800"
          height="450"
          :loading="eager ? 'eager' : 'lazy'"
          :fetchpriority="eager ? 'high' : 'auto'"
          decoding="async"
          @error="imageFailed = true"
        >
        <div v-else class="walkthrough-card__fallback" aria-hidden="true">
          <i class="bi bi-play-btn"></i>
        </div>
        <span class="walkthrough-card__scrim" aria-hidden="true"></span>
        <span class="walkthrough-card__play" aria-hidden="true">
          <i class="bi bi-play-fill"></i>
        </span>
        <span v-if="durationText" class="walkthrough-card__duration">
          <span class="visually-hidden">{{ t('homepage.tutorials.duration', { time: durationText }) }}</span>
          <span aria-hidden="true">{{ durationText }}</span>
        </span>
      </div>
      <div class="walkthrough-card__body">
        <p v-if="category" class="walkthrough-card__category">{{ category }}</p>
        <h2 class="walkthrough-card__title">{{ title }}</h2>
        <p v-if="summary" class="walkthrough-card__excerpt">{{ summary }}</p>
      </div>
    </button>
    <walkthrough-video-modal
      :open="modalOpen"
      :kicker="kicker"
      :title="title"
      :lead="summary"
      :detail="detail"
      :video-id="resolvedVideoId"
      :feature-id="resolvedFeatureId"
      @close="modalOpen = false"
      @duration="onDuration"
    />
  </article>
</template>

<script>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import WalkthroughVideoModal from './WalkthroughVideoModal.vue'
import { trackTutorialImpression } from '../../scripts/analytics/tutorialAnalytics.js'
import { formatTutorialDuration, tutorialDurationLabel } from '../../config/tutorialVideos.js'
import { extractYoutubeVideoId } from '../../scripts/seo/youtubeEmbed.js'

export default {
  name: 'WalkthroughCard',
  components: { WalkthroughVideoModal },
  props: {
    title: { type: String, required: true },
    summary: { type: String, required: true },
    detail: { type: String, default: '' },
    kicker: { type: String, default: '' },
    index: { type: Number, default: 0 },
    category: { type: String, default: '' },
    featureId: { type: String, default: '' },
    durationLabel: { type: String, default: '' },
    youtubeId: { type: String, default: '' },
    youtubeWatch: { type: String, default: '' },
    image: { type: String, default: '' },
    imageAlt: { type: String, default: '' },
    eager: { type: Boolean, default: false },
    featured: { type: Boolean, default: false },
  },
  setup(props) {
    const { t } = useI18n()
    const cardRef = ref(null)
    const imageFailed = ref(false)
    const modalOpen = ref(false)
    const liveDuration = ref(0)
    let impressionObserver = null

    const resolvedVideoId = computed(() => (
      extractYoutubeVideoId(props.youtubeId)
      || extractYoutubeVideoId(props.youtubeWatch)
    ))
    const resolvedFeatureId = computed(() => {
      const explicit = String(props.featureId || '').trim()
      if (/^[a-z0-9-]{1,40}$/.test(explicit)) return explicit
      return ''
    })
    const durationText = computed(() => (
      props.durationLabel
      || tutorialDurationLabel(resolvedVideoId.value)
      || formatTutorialDuration(liveDuration.value)
    ))
    const analyticsVideo = () => ({
      id: resolvedVideoId.value,
      featureId: resolvedFeatureId.value,
      feature: props.title,
    })

    const openModal = () => {
      modalOpen.value = true
    }

    const onDuration = (seconds) => {
      if (durationText.value || !(seconds > 0)) return
      liveDuration.value = Math.round(seconds)
    }

    onMounted(() => {
      const node = cardRef.value
      if (!node || typeof IntersectionObserver === 'undefined') return
      impressionObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting || entry.intersectionRatio < 0.5) return
          trackTutorialImpression(analyticsVideo())
          impressionObserver?.disconnect()
        })
      }, { threshold: 0.5 })
      impressionObserver.observe(node)
    })

    onBeforeUnmount(() => {
      impressionObserver?.disconnect()
    })

    return {
      t,
      cardRef,
      imageFailed,
      modalOpen,
      resolvedVideoId,
      resolvedFeatureId,
      durationText,
      openModal,
      onDuration,
    }
  },
}
</script>
