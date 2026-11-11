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
            <div v-if="open && videoId" class="walkthrough-video-dialog__frame-wrap">
              <div ref="playerMount" class="walkthrough-video-dialog__frame"></div>
            </div>
            <p v-else class="walkthrough-video-dialog__empty" role="status">
              {{ t('howItWorksPage.videoUnavailable') }}
            </p>
            <p v-if="detail && playable" class="walkthrough-video-dialog__detail">{{ detail }}</p>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  noteTutorialPlaybackTime,
  trackTutorialComplete,
  trackTutorialPlay,
} from '../../scripts/analytics/tutorialAnalytics.js'
import { mountTutorialPlayback } from '../../scripts/tutorials/youtubePlayer.js'
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
    featureId: { type: String, default: '' },
  },
  emits: ['close', 'duration'],
  setup(props, { emit }) {
    const { t } = useI18n()
    const dialogRef = ref(null)
    const playerMount = ref(null)
    const titleId = `walkthrough-video-title-${Math.random().toString(36).slice(2, 9)}`
    let playback = null
    let playbackToken = 0

    const playable = computed(() => Boolean(props.open && youtubeNoCookieEmbedSrc(props.videoId)))
    const analyticsVideo = () => ({
      id: props.videoId,
      featureId: props.featureId,
      feature: props.title,
    })

    const stopPlayback = () => {
      try {
        playback?.destroy?.()
      } catch {
        /* ignore */
      }
      playback = null
    }

    const close = () => emit('close')

    const onKeydown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        close()
      }
    }

    const startPlayback = async () => {
      const mount = playerMount.value
      const token = playbackToken
      if (!mount || !playable.value) return
      const video = analyticsVideo()
      try {
        const handle = await mountTutorialPlayback(mount, props.videoId, {
          origin: window.location.origin,
          onPlay: () => trackTutorialPlay(video, token),
          onTime: (current, duration) => noteTutorialPlaybackTime(video, token, current, duration),
          onComplete: () => trackTutorialComplete(video, token),
          onDuration: (seconds) => emit('duration', seconds),
        })
        if (token !== playbackToken) {
          handle?.destroy?.()
          return
        }
        playback = handle
      } catch {
        /* fallback iframe stays inside the player helper */
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
          playbackToken += 1
          stopPlayback()
          return
        }
        playbackToken += 1
        await nextTick()
        dialogRef.value?.focus()
        startPlayback()
      },
    )

    onBeforeUnmount(() => {
      stopPlayback()
      if (typeof document !== 'undefined') {
        document.body.style.overflow = ''
      }
    })

    return {
      t,
      dialogRef,
      playerMount,
      titleId,
      playable,
      close,
      onKeydown,
    }
  },
}
</script>
