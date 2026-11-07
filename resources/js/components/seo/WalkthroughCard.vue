<template>
  <article class="walkthrough-card">
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
          height="500"
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
      </div>
      <div class="walkthrough-card__body">
        <p v-if="category" class="walkthrough-card__category">{{ category }}</p>
        <h2 class="walkthrough-card__title">{{ title }}</h2>
        <p class="walkthrough-card__excerpt">{{ summary }}</p>
        <p class="walkthrough-card__action">{{ t('howItWorksPage.watchVideo') }}</p>
      </div>
    </button>
    <walkthrough-video-modal
      :open="modalOpen"
      :title="title"
      :video-id="resolvedVideoId"
      @close="modalOpen = false"
    />
  </article>
</template>

<script>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import WalkthroughVideoModal from './WalkthroughVideoModal.vue'
import { extractYoutubeVideoId } from '../../scripts/seo/youtubeEmbed.js'

export default {
  name: 'WalkthroughCard',
  components: { WalkthroughVideoModal },
  props: {
    title: { type: String, required: true },
    summary: { type: String, required: true },
    category: { type: String, default: '' },
    youtubeId: { type: String, default: '' },
    youtubeWatch: { type: String, default: '' },
    image: { type: String, default: '' },
    imageAlt: { type: String, default: '' },
    eager: { type: Boolean, default: false },
  },
  setup(props) {
    const { t } = useI18n()
    const imageFailed = ref(false)
    const modalOpen = ref(false)
    const resolvedVideoId = computed(() => (
      extractYoutubeVideoId(props.youtubeId)
      || extractYoutubeVideoId(props.youtubeWatch)
    ))
    const openModal = () => {
      modalOpen.value = true
    }
    return {
      t,
      imageFailed,
      modalOpen,
      resolvedVideoId,
      openModal,
    }
  },
}
</script>
