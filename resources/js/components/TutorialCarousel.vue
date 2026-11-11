<template>
  <section id="tutorials" class="tutorials" aria-labelledby="tutorials-title">
    <div class="wrap">
      <header class="tutorials__head" data-reveal>
        <div class="tutorials__intro">
          <h2 id="tutorials-title" class="section-title">{{ t('homepage.tutorials.title') }}</h2>
          <p class="section-sub">{{ t('homepage.tutorials.subtitle') }}</p>
        </div>
        <a class="tutorials__all" :href="tutorialsPath">
          <span>{{ t('homepage.tutorials.watchAll') }}</span>
          <i class="bi bi-arrow-right" aria-hidden="true"></i>
        </a>
      </header>

      <article
        v-if="featured"
        class="tutorials__featured"
        data-tutorial-card
        :data-video-id="featured.id"
      >
        <h3 class="tutorials__heading">
          <button type="button" class="tutorials__open" @click="openVideo(featured, $event)">
            <span class="visually-hidden">{{ t('homepage.tutorials.watch') }}</span>
            <span class="tutorials__media">
              <img
                v-if="thumbSrc(featured)"
                class="tutorials__thumb"
                :src="thumbSrc(featured)"
                :alt="featured.feature"
                width="1280"
                height="720"
                loading="lazy"
                decoding="async"
                draggable="false"
                @error="onThumbError(featured.id)"
              >
              <span v-else class="tutorials__fallback" aria-hidden="true">
                <i class="bi bi-play-btn"></i>
              </span>
              <span class="tutorials__play" aria-hidden="true">
                <i class="bi bi-play-fill"></i>
              </span>
              <span v-if="durationOf(featured)" class="tutorials__duration">
                <span class="visually-hidden">{{ t('homepage.tutorials.duration', { time: durationOf(featured) }) }}</span>
                <span aria-hidden="true">{{ durationOf(featured) }}</span>
              </span>
            </span>
            <span class="tutorials__body">
              <span class="tutorials__feature" lang="en">{{ featured.feature }}</span>
              <span class="tutorials__tagline" lang="en">{{ featured.tagline }}</span>
            </span>
            </button>
        </h3>
      </article>

      <div
        class="tutorials__grid"
        role="list"
        :aria-label="t('homepage.tutorials.regionLabel')"
      >
        <article
          v-for="video in videos"
          :key="video.id"
          class="tutorials__card"
          role="listitem"
          data-tutorial-card
          :data-video-id="video.id"
        >
          <h3 class="tutorials__heading">
            <button type="button" class="tutorials__open" @click="openVideo(video, $event)">
              <span class="visually-hidden">{{ t('homepage.tutorials.watch') }}</span>
              <span class="tutorials__media">
                <img
                  v-if="thumbSrc(video)"
                  class="tutorials__thumb"
                  :src="thumbSrc(video)"
                  :alt="video.feature"
                  width="640"
                  height="360"
                  loading="lazy"
                  decoding="async"
                  draggable="false"
                  @error="onThumbError(video.id)"
                >
                <span v-else class="tutorials__fallback" aria-hidden="true">
                  <i class="bi bi-play-btn"></i>
                </span>
                <span class="tutorials__play" aria-hidden="true">
                  <i class="bi bi-play-fill"></i>
                </span>
                <span v-if="durationOf(video)" class="tutorials__duration">
                  <span class="visually-hidden">{{ t('homepage.tutorials.duration', { time: durationOf(video) }) }}</span>
                  <span aria-hidden="true">{{ durationOf(video) }}</span>
                </span>
              </span>
              <span class="tutorials__body">
                <span class="tutorials__feature" lang="en">{{ video.feature }}</span>
                <span class="tutorials__tagline" lang="en">{{ video.tagline }}</span>
              </span>
            </button>
          </h3>
        </article>
      </div>
    </div>

    <Teleport to="body">
      <div
        ref="modalRef"
        class="modal fade tutorials-modal"
        tabindex="-1"
        aria-hidden="true"
        :aria-labelledby="titleId"
      >
        <div class="modal-dialog modal-dialog-centered tutorials-modal__dialog">
          <div class="modal-content">
            <div class="modal-header tutorials-modal__bar">
              <div class="tutorials-modal__heading">
                <p class="tutorials-modal__kicker">{{ t('homepage.tutorials.modalKicker') }}</p>
                <h2 :id="titleId" class="modal-title" lang="en">{{ activeVideo?.feature }}</h2>
                <p v-if="activeVideo?.tagline" class="tutorials-modal__lead" lang="en">{{ activeVideo.tagline }}</p>
              </div>
              <button
                type="button"
                class="btn-close"
                data-bs-dismiss="modal"
                :aria-label="t('common.close')"
              ></button>
            </div>
            <div class="modal-body">
              <div class="tutorials-modal__stage">
                <div v-if="playerSrc" class="tutorials-modal__mount">
                  <div ref="playerMount" class="tutorials-modal__frame"></div>
                </div>
                <p v-else-if="activeVideo && !playable" class="tutorials-modal__empty" role="status">
                  {{ t('homepage.tutorials.unavailable') }}
                </p>
              </div>
              <p v-if="activeVideo?.description && playable" class="tutorials-modal__desc" lang="en">
                {{ activeVideo.description }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </section>
</template>

<script>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Modal from 'bootstrap/js/dist/modal'
import {
  noteTutorialPlaybackTime,
  trackTutorialComplete,
  trackTutorialImpression,
  trackTutorialPlay,
} from '../scripts/analytics/tutorialAnalytics.js'
import { mountTutorialPlayback } from '../scripts/tutorials/youtubePlayer.js'
import {
  TUTORIALS_PAGE_PATH,
  featuredTutorial,
  formatTutorialDuration,
  homepageTutorialVideos,
  tutorialDurationLabel,
  tutorialThumbnailUrl,
} from '../config/tutorialVideos.js'
import { youtubeNoCookieEmbedSrc } from '../scripts/seo/youtubeEmbed.js'

export default {
  name: 'TutorialCarousel',
  setup() {
    const { t } = useI18n()
    const videos = homepageTutorialVideos()
    const featured = featuredTutorial()
    const tutorialsPath = TUTORIALS_PAGE_PATH
    const titleId = 'tutorial-video-title'
    const modalRef = ref(null)
    const playerMount = ref(null)
    const activeVideo = ref(null)
    const playerSrc = ref('')
    const playable = ref(true)
    const failedThumbs = ref({})
    const liveDurations = ref({})

    let modal = null
    let opener = null
    let playback = null
    let playbackToken = 0
    let impressionObserver = null

    const catalog = computed(() => (featured ? [featured, ...videos] : videos))

    const thumbSrc = (video) => (
      failedThumbs.value[video.id] ? '' : tutorialThumbnailUrl(video.id)
    )

    const durationOf = (video) => (
      tutorialDurationLabel(video.id) || formatTutorialDuration(liveDurations.value[video.id])
    )

    const onThumbError = (id) => {
      failedThumbs.value = { ...failedThumbs.value, [id]: true }
    }

    const stopPlayback = () => {
      try {
        playback?.destroy?.()
      } catch {
        /* ignore */
      }
      playback = null
    }

    const openVideo = (video, event) => {
      const src = youtubeNoCookieEmbedSrc(video.id)
      stopPlayback()
      playbackToken += 1
      activeVideo.value = video
      playable.value = Boolean(src)
      playerSrc.value = src
      opener = event.currentTarget
      nextTick(() => modal?.show())
    }

    const onModalHide = () => {
      stopPlayback()
      playerSrc.value = ''
    }

    const onModalHidden = () => {
      activeVideo.value = null
      playable.value = true
      const trigger = opener
      opener = null
      if (trigger && document.contains(trigger)) trigger.focus()
    }

    const onModalShown = () => {
      document.querySelectorAll('.modal-backdrop').forEach((node) => {
        node.classList.add('tutorials-modal-backdrop')
      })
      const video = activeVideo.value
      const mount = playerMount.value
      const token = playbackToken
      if (!video || !mount || !playerSrc.value) return
      mountTutorialPlayback(mount, video.id, {
        origin: window.location.origin,
        onPlay: () => trackTutorialPlay(video, token),
        onTime: (current, duration) => noteTutorialPlaybackTime(video, token, current, duration),
        onComplete: () => trackTutorialComplete(video, token),
        onDuration: (seconds) => {
          if (tutorialDurationLabel(video.id) || !(seconds > 0)) return
          liveDurations.value = { ...liveDurations.value, [video.id]: Math.round(seconds) }
        },
      }).then((handle) => {
        if (token !== playbackToken) {
          handle?.destroy?.()
          return
        }
        playback = handle
      }).catch(() => {
        /* fallback iframe is mounted inside the player helper */
      })
    }

    const observeImpressions = () => {
      const root = modalRef.value?.closest?.('section') || document.getElementById('tutorials')
      if (!root || typeof IntersectionObserver === 'undefined') return
      const byId = new Map(catalog.value.map((video) => [video.id, video]))
      impressionObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting || entry.intersectionRatio < 0.5) return
          const id = entry.target.getAttribute('data-video-id')
          const video = byId.get(id)
          if (!video) return
          trackTutorialImpression(video)
          impressionObserver?.unobserve(entry.target)
        })
      }, { threshold: 0.5 })
      root.querySelectorAll('[data-tutorial-card]').forEach((card) => {
        impressionObserver.observe(card)
      })
    }

    onMounted(() => {
      const el = modalRef.value
      if (el) {
        modal = Modal.getOrCreateInstance(el, {
          backdrop: true,
          keyboard: true,
          focus: true,
        })
        el.addEventListener('hide.bs.modal', onModalHide)
        el.addEventListener('hidden.bs.modal', onModalHidden)
        el.addEventListener('shown.bs.modal', onModalShown)
      }
      observeImpressions()
    })

    onBeforeUnmount(() => {
      stopPlayback()
      impressionObserver?.disconnect()
      const el = modalRef.value
      el?.removeEventListener('hide.bs.modal', onModalHide)
      el?.removeEventListener('hidden.bs.modal', onModalHidden)
      el?.removeEventListener('shown.bs.modal', onModalShown)
      modal?.dispose()
      modal = null
      document.querySelectorAll('.tutorials-modal-backdrop').forEach((node) => node.remove())
    })

    return {
      t,
      videos,
      featured,
      tutorialsPath,
      titleId,
      modalRef,
      playerMount,
      activeVideo,
      playerSrc,
      playable,
      thumbSrc,
      durationOf,
      onThumbError,
      openVideo,
    }
  },
}
</script>

<style scoped>
.tutorials {
  --tutorial-ease: cubic-bezier(0.16, 1, 0.3, 1);
  border-block: 1px solid color-mix(in srgb, var(--accent) 11%, var(--border));
  background: color-mix(in srgb, var(--accent-light) 24%, var(--bg));
}

.wrap {
  width: min(1240px, 100%);
  margin-inline: auto;
  padding-inline: clamp(1rem, 3vw, 1.5rem);
  padding-block: clamp(2.6rem, 5.4vw, 4.25rem);
}

.tutorials__head {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  margin-bottom: clamp(1.5rem, 3vw, 2.15rem);
  text-align: center;
}

.tutorials__intro {
  min-width: 0;
  max-width: 40rem;
}

.tutorials__intro .section-title {
  margin-bottom: 0.55rem;
  font-size: clamp(1.7rem, 2.8vw, 2.2rem);
}

.tutorials__intro .section-sub {
  max-width: 38rem;
  margin-inline: auto;
  font-size: clamp(1rem, 1.4vw, 1.08rem);
  line-height: 1.65;
}

.tutorials__all {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  min-height: 2.75rem;
  padding: 0.45rem 0.95rem;
  border: 1px solid color-mix(in srgb, var(--accent) 28%, var(--border));
  border-radius: 999px;
  background: color-mix(in srgb, var(--surface-strong) 88%, var(--accent-light));
  color: var(--accent-strong);
  font-family: var(--hp-text, inherit);
  font-size: 0.92rem;
  font-weight: 650;
  line-height: 1.3;
  text-decoration: none;
  white-space: nowrap;
}

.tutorials__all:hover {
  border-color: color-mix(in srgb, var(--accent) 48%, var(--border));
  background: color-mix(in srgb, var(--accent-light) 55%, var(--surface-strong));
  color: var(--accent-strong);
  text-decoration: none;
}

.tutorials__all .bi {
  font-size: 0.95rem;
}

.tutorials__grid {
  --tutorial-gap: clamp(0.85rem, 2vw, 1rem);
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--tutorial-gap);
}

@media (min-width: 640px) {
  .tutorials__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 768px) {
  .tutorials__grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.tutorials__open:focus-visible {
  outline: 2px solid var(--focus-ring-color, var(--accent));
  outline-offset: -3px;
}

.tutorials__card,
.tutorials__featured {
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
  border: 1px solid rgba(78, 58, 38, 0.12);
  border-radius: 1.05rem;
  background: #fff;
  box-shadow: 0 10px 24px -20px rgba(45, 32, 20, 0.35);
  transition:
    border-color 0.18s var(--tutorial-ease),
    transform 0.18s var(--tutorial-ease),
    box-shadow 0.18s var(--tutorial-ease);
}

.tutorials__featured {
  width: min(860px, 100%);
  margin: 0 auto clamp(1.15rem, 2.4vw, 1.6rem);
}

.tutorials__card:hover,
.tutorials__featured:hover {
  border-color: rgba(139, 94, 60, 0.38);
  transform: translateY(-6px);
  box-shadow: 0 22px 36px -22px rgba(45, 32, 20, 0.4);
}

.tutorials__heading {
  margin: 0;
  font: inherit;
}

.tutorials__open {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0;
  width: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: start;
  cursor: pointer;
  box-shadow: none;
}

.tutorials__open:hover {
  background: transparent;
}

.tutorials__body {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 1rem 1.1rem 1.15rem;
}

.tutorials__feature {
  display: block;
  color: var(--hp-heading, var(--text));
  font-family: var(--hp-display, "Source Serif 4", Georgia, serif);
  font-size: clamp(1.12rem, 1.5vw, 1.28rem);
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.25;
}

.tutorials__media {
  position: relative;
  display: block;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border-radius: 0;
  background: #ece7df;
}

.tutorials__media::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(20, 16, 12, 0.34), transparent 46%);
  opacity: 0.55;
  transition: opacity 0.45s var(--tutorial-ease);
  pointer-events: none;
}

.tutorials__open:hover .tutorials__media::after {
  opacity: 0.2;
}

.tutorials__thumb,
.tutorials__fallback {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.tutorials__thumb {
  object-fit: cover;
  object-position: center;
  transition: transform 0.7s var(--tutorial-ease);
}

.tutorials__open:hover .tutorials__thumb {
  transform: scale(1.06);
}

.tutorials__fallback {
  display: grid;
  place-items: center;
  color: var(--accent-strong);
  font-size: 1.6rem;
}

.tutorials__play {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 1;
  display: grid;
  width: 2.85rem;
  height: 2.85rem;
  place-items: center;
  border: 0;
  border-radius: 999px;
  background: #fff;
  color: #6f4a2e;
  font-size: 1.25rem;
  box-shadow: 0 8px 20px -10px rgba(0, 0, 0, 0.55);
  transform: translate(-50%, -50%);
  transition: transform 0.45s var(--tutorial-ease), background 0.35s ease, color 0.35s ease;
  pointer-events: none;
}

.tutorials__duration {
  position: absolute;
  right: 0.55rem;
  bottom: 0.55rem;
  z-index: 1;
  padding: 0.12rem 0.4rem;
  border-radius: 0.35rem;
  background: rgba(20, 16, 12, 0.72);
  color: #fff;
  font-size: 0.72rem;
  font-weight: 650;
  letter-spacing: 0.01em;
  line-height: 1.35;
}

.tutorials__play .bi {
  margin-inline-start: 0.12rem;
}

.tutorials__open:hover .tutorials__play {
  transform: translate(-50%, -50%) scale(1.1);
  background: #f6efe6;
}

.tutorials__tagline {
  display: -webkit-box;
  overflow: hidden;
  color: var(--hp-muted, var(--text-muted));
  font-size: 0.94rem;
  font-weight: 450;
  line-height: 1.5;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
}

@media (max-width: 767.98px) {
  .wrap {
    padding-block: 2.15rem 2.35rem;
  }

  .tutorials__body {
    padding: 0.9rem 0.95rem 1rem;
  }

  .tutorials__play {
    width: 3rem;
    height: 3rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .tutorials__card,
  .tutorials__featured,
  .tutorials__open,
  .tutorials__play,
  .tutorials__thumb,
  .tutorials__open:hover .tutorials__play,
  .tutorials__open:hover .tutorials__thumb {
    transition: none;
    transform: none;
  }

  .tutorials__play,
  .tutorials__open:hover .tutorials__play {
    transform: translate(-50%, -50%);
  }

  .tutorials__card:hover,
  .tutorials__featured:hover,
  .tutorials__open:hover {
    transform: none;
  }
}

</style>

<style>
.tutorials-modal {
  z-index: 12060;
  font-family: "Nunito", "Avenir Next", "Segoe UI", "Noto Naskh Arabic", system-ui, sans-serif;
}

.tutorials-modal-backdrop {
  z-index: 12050;
}

.tutorials-modal__dialog {
  width: min(1120px, calc(100% - 1.5rem));
  max-width: 1120px;
}

.tutorials-modal.modal .modal-content {
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--border) 85%, transparent);
  border-radius: 1.15rem;
  background-color: var(--surface-strong);
  background-image: none;
  color: var(--text);
  box-shadow: 0 24px 48px -28px color-mix(in srgb, var(--text) 55%, transparent);
}

.tutorials-modal .modal-header {
  align-items: flex-start;
  gap: 1rem;
  padding: 1.05rem 1.15rem 0.95rem;
  border-bottom: 0;
  background: transparent;
}

.tutorials-modal__heading {
  display: grid;
  gap: 0.2rem;
  min-width: 0;
}

.tutorials-modal__kicker {
  margin: 0;
  color: var(--accent-strong);
  font-size: 0.72rem;
  font-weight: 750;
  letter-spacing: 0.08em;
  line-height: 1.2;
  text-transform: uppercase;
}

.tutorials-modal .modal-title {
  margin: 0;
  color: var(--text);
  font-family: "Source Serif 4", "Iowan Old Style", Palatino, "Amiri", Georgia, serif;
  font-size: clamp(1.35rem, 2vw, 1.7rem);
  font-weight: 600;
  letter-spacing: -0.025em;
  line-height: 1.2;
}

.tutorials-modal__lead {
  margin: 0.15rem 0 0;
  max-width: 46rem;
  color: var(--text-muted);
  font-size: 0.98rem;
  font-weight: 450;
  line-height: 1.45;
}

.tutorials-modal .btn-close {
  flex: 0 0 auto;
  width: 2.5rem;
  height: 2.5rem;
  margin: 0;
  padding: 0;
  border-radius: 999px;
  background-color: color-mix(in srgb, var(--surface-soft) 80%, var(--bg));
  opacity: 1;
}

.tutorials-modal .btn-close:hover {
  opacity: 1;
}

html[data-theme="dark"] .tutorials-modal .modal-content {
  background: #1c1916;
  border-color: rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.94);
}

html[data-theme="dark"] .tutorials-modal .modal-title {
  color: rgba(255, 255, 255, 0.96);
}

html[data-theme="dark"] .tutorials-modal__kicker {
  color: #e8bf8f;
}

html[data-theme="dark"] .tutorials-modal__lead,
html[data-theme="dark"] .tutorials-modal__desc {
  color: rgba(255, 255, 255, 0.74);
}

html[data-theme="dark"] .tutorials-modal .btn-close {
  filter: invert(1) grayscale(1);
  background-color: rgba(255, 255, 255, 0.08);
  opacity: 0.9;
}

.tutorials-modal .modal-body {
  padding: 0 0.85rem 0.95rem;
  background: transparent;
}

.tutorials-modal__stage {
  position: relative;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border-radius: 0.85rem;
  background: #14110f;
}

.tutorials-modal__mount,
.tutorials-modal__frame,
.tutorials-modal__stage iframe {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: 0;
}

.tutorials-modal__empty,
.tutorials-modal__desc {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.92rem;
  line-height: 1.5;
}

.tutorials-modal__empty {
  display: grid;
  place-items: center;
  height: 100%;
  padding: 1.5rem;
  text-align: center;
}

.tutorials-modal__desc {
  padding: 0.85rem 0.35rem 0.2rem;
  font-size: 0.98rem;
  line-height: 1.55;
}

@media (max-width: 767.98px) {
  .tutorials-modal__dialog {
    width: calc(100% - 0.75rem);
    margin-inline: auto;
  }

  .tutorials-modal .modal-header {
    padding: 0.9rem 0.85rem 0.7rem;
  }

  .tutorials-modal .modal-body {
    padding: 0 0.55rem 0.75rem;
  }

  .tutorials-modal__lead {
    font-size: 0.92rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .tutorials-modal.fade .modal-dialog {
    transition: none;
  }
}

html[data-theme="light"] .tutorials-modal.modal .modal-content,
html:not([data-theme]) .tutorials-modal.modal .modal-content {
  background: #fff;
  border-color: rgba(78, 58, 38, 0.14);
  color: #1f1a17;
}

html[data-theme="light"] .tutorials-modal__kicker,
html:not([data-theme]) .tutorials-modal__kicker {
  color: #6f4a2e;
}

html[data-theme="light"] .tutorials-modal__lead,
html[data-theme="light"] .tutorials-modal__desc,
html:not([data-theme]) .tutorials-modal__lead,
html:not([data-theme]) .tutorials-modal__desc {
  color: #5c534c;
}

html[data-theme="sepia"] .tutorials-modal.modal .modal-content {
  background: #fbf6ea;
  border-color: #d9cbb0;
  color: #3b2f20;
}

html[data-theme="sepia"] .tutorials-modal__kicker {
  color: #6f4a2e;
}

html[data-theme="sepia"] .tutorials-modal .modal-title {
  color: #3b2f20;
}

html[data-theme="sepia"] .tutorials-modal__lead,
html[data-theme="sepia"] .tutorials-modal__desc {
  color: #6b5b45;
}

html[data-theme="dark"] .tutorials-modal.modal .modal-content {
  background: #1c1916;
  border-color: rgba(255, 255, 255, 0.12);
  box-shadow: 0 28px 60px -24px rgba(0, 0, 0, 0.72);
}

@media (min-width: 992px) {
  .tutorials-modal.modal {
    position: fixed;
    inset: 0;
    width: 100vw;
    height: 100vh;
    padding: 0;
  }

  .tutorials-modal.modal.show {
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
  }

  .tutorials-modal.modal.fade .tutorials-modal__dialog,
  .tutorials-modal.modal.show .tutorials-modal__dialog {
    position: relative;
    top: auto;
    right: auto;
    bottom: auto;
    left: auto;
    display: flex;
    align-items: center;
    justify-content: center;
    width: min(1000px, calc(100vw - 4rem));
    max-width: 1000px;
    min-height: 0;
    height: auto;
    margin: 0 !important;
    transform: none !important;
  }

  .tutorials-modal.modal.show .modal-content {
    width: 100%;
  }
}

.homepage[data-theme="light"] .tutorials,
.homepage:not([data-theme]) .tutorials {
  border-block-color: rgba(78, 58, 38, 0.1);
  background: #ebe4d8;
}

.homepage[data-theme="light"] .tutorials__card,
.homepage[data-theme="light"] .tutorials__featured,
.homepage:not([data-theme]) .tutorials__card,
.homepage:not([data-theme]) .tutorials__featured {
  background: #fff;
  border-color: rgba(78, 58, 38, 0.12);
  color: #1f1a17;
}

.homepage[data-theme="light"] .tutorials__feature,
.homepage:not([data-theme]) .tutorials__feature {
  color: #1f1a17;
}

.homepage[data-theme="light"] .tutorials__tagline,
.homepage:not([data-theme]) .tutorials__tagline {
  color: #5c534c;
}

.homepage[data-theme="light"] .tutorials__all,
.homepage:not([data-theme]) .tutorials__all {
  background: #fff;
  border-color: rgba(78, 58, 38, 0.16);
  color: #6f4a2e;
}

.homepage[data-theme="sepia"] .tutorials {
  border-block-color: #d9cbb0;
  background: #e8dcc4;
}

.homepage[data-theme="sepia"] .tutorials__card,
.homepage[data-theme="sepia"] .tutorials__featured {
  background: #fbf6ea;
  border-color: #d9cbb0;
  box-shadow: 0 12px 24px -20px rgba(80, 56, 28, 0.35);
}

.homepage[data-theme="sepia"] .tutorials__card:hover,
.homepage[data-theme="sepia"] .tutorials__featured:hover {
  background: #fffaf0;
  border-color: #c4ad8c;
}

.homepage[data-theme="sepia"] .tutorials__feature {
  color: #3b2f20;
}

.homepage[data-theme="sepia"] .tutorials__tagline {
  color: #6b5b45;
}

.homepage[data-theme="sepia"] .tutorials__all {
  background: #fbf6ea;
  border-color: #d9cbb0;
  color: #6f4a2e;
}

.homepage[data-theme="sepia"] .tutorials__media {
  background: #e7dcc4;
}

.homepage[data-theme="dark"] .tutorials {
  border-block-color: rgba(232, 191, 143, 0.14);
  background: #181412;
}

.homepage[data-theme="dark"] .tutorials__card,
.homepage[data-theme="dark"] .tutorials__featured {
  background: #221e1a;
  border-color: rgba(255, 255, 255, 0.1);
  box-shadow: 0 16px 28px -22px rgba(0, 0, 0, 0.7);
}

.homepage[data-theme="dark"] .tutorials__card:hover,
.homepage[data-theme="dark"] .tutorials__featured:hover {
  background: #2a241f;
  border-color: rgba(232, 191, 143, 0.45);
}

.homepage[data-theme="dark"] .tutorials__duration {
  background: rgba(0, 0, 0, 0.62);
  color: #fff;
}

.homepage[data-theme="dark"] .tutorials__feature {
  color: rgba(255, 255, 255, 0.96);
}

.homepage[data-theme="dark"] .tutorials__tagline {
  color: rgba(255, 255, 255, 0.72);
}

.homepage[data-theme="dark"] .tutorials__all {
  background: #221e1a;
  border-color: rgba(232, 191, 143, 0.32);
  color: #e8bf8f;
}

.homepage[data-theme="dark"] .tutorials__play {
  background: #f6efe6;
  color: #3b2f20;
}

.homepage[data-theme="dark"] .tutorials__media {
  background: #1a1613;
}

html[dir="rtl"] .tutorials__all .bi-arrow-right {
  transform: scaleX(-1);
}
</style>
