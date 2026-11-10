<template>
  <Teleport to="body">
    <transition name="walkthrough-video-fade">
      <div
        v-if="open"
        class="walkthrough-video-overlay"
        role="presentation"
        @click.self="close"
      >
        <div
          ref="dialogRef"
          class="walkthrough-video-dialog"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="titleId"
          tabindex="-1"
          @keydown="onKeydown"
        >
          <header class="walkthrough-video-dialog__head">
            <div class="walkthrough-video-dialog__heading">
              <p v-if="kicker" class="walkthrough-video-dialog__kicker">{{ kicker }}</p>
              <h2 :id="titleId" class="walkthrough-video-dialog__title">{{ title }}</h2>
              <p v-if="lead" class="walkthrough-video-dialog__lead">{{ lead }}</p>
            </div>
            <button
              type="button"
              class="walkthrough-video-dialog__close"
              :aria-label="t('common.close')"
              @click="close"
            >
              <i class="bi bi-x-lg" aria-hidden="true"></i>
            </button>
          </header>
          <div class="walkthrough-video-dialog__body">
            <div v-if="embedSrc" class="walkthrough-video-dialog__frame-wrap">
              <iframe
                class="walkthrough-video-dialog__frame"
                :src="embedSrc"
                :title="title"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowfullscreen
                referrerpolicy="strict-origin-when-cross-origin"
              ></iframe>
            </div>
            <p v-else class="walkthrough-video-dialog__empty" role="status">
              {{ t('howItWorksPage.videoUnavailable') }}
            </p>
            <p v-if="detail && embedSrc" class="walkthrough-video-dialog__detail">{{ detail }}</p>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script>
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { youtubeNoCookieEmbedSrc } from '../../scripts/seo/youtubeEmbed.js'

export default {
  name: 'WalkthroughVideoModal',
  props: {
    open: { type: Boolean, default: false },
    kicker: { type: String, default: '' },
    title: { type: String, default: '' },
    lead: { type: String, default: '' },
    detail: { type: String, default: '' },
    videoId: { type: String, default: '' },
  },
  emits: ['close'],
  setup(props, { emit }) {
    const { t } = useI18n()
    const dialogRef = ref(null)
    const titleId = `walkthrough-video-title-${Math.random().toString(36).slice(2, 9)}`
    const embedSrc = computed(() => {
      const base = props.open ? youtubeNoCookieEmbedSrc(props.videoId) : ''
      if (!base) return ''
      return `${base}&modestbranding=1&iv_load_policy=3&playsinline=1&color=white`
    })

    const close = () => emit('close')

    const onKeydown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        close()
      }
    }

    watch(
      () => props.open,
      async (isOpen) => {
        if (typeof document === 'undefined') {
          return
        }
        document.body.style.overflow = isOpen ? 'hidden' : ''
        if (!isOpen) {
          return
        }
        await nextTick()
        dialogRef.value?.focus()
      },
    )

    return {
      t,
      dialogRef,
      titleId,
      embedSrc,
      close,
      onKeydown,
    }
  },
}
</script>
