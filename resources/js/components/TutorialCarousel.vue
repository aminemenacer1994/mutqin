<template>
  <section id="tutorials" class="tutorials" aria-labelledby="tutorials-title" @keydown="onKeydown">
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

      <div class="tutorials__stage">
        <button
          type="button"
          class="tutorials__arrow tutorials__arrow--prev"
          :disabled="atStart"
          :aria-label="t('homepage.tutorials.previous')"
          aria-controls="tutorial-carousel-track"
          @click="step(-1)"
        >
          <i class="bi" :class="isRtl ? 'bi-chevron-right' : 'bi-chevron-left'" aria-hidden="true"></i>
        </button>

        <div
          id="tutorial-carousel-track"
          ref="trackRef"
          class="tutorials__track"
          :class="{ 'is-dragging': dragging }"
          role="region"
          tabindex="0"
          :aria-label="t('homepage.tutorials.regionLabel')"
          aria-roledescription="carousel"
          @scroll.passive="onScroll"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointercancel="onPointerUp"
          @click.capture="onTrackClick"
        >
          <article
            v-for="video in videos"
            :key="video.id"
            class="tutorials__card"
            data-tutorial-card
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
                </span>
                <span class="tutorials__body">
                  <span class="tutorials__feature" lang="en">{{ video.feature }}</span>
                  <span class="tutorials__tagline" lang="en">{{ video.tagline }}</span>
                </span>
              </button>
            </h3>
          </article>
        </div>

        <button
          type="button"
          class="tutorials__arrow tutorials__arrow--next"
          :disabled="atEnd"
          :aria-label="t('homepage.tutorials.next')"
          aria-controls="tutorial-carousel-track"
          @click="step(1)"
        >
          <i class="bi" :class="isRtl ? 'bi-chevron-left' : 'bi-chevron-right'" aria-hidden="true"></i>
        </button>
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
                <iframe
                  v-if="playerSrc"
                  class="tutorials-modal__frame"
                  :src="playerSrc"
                  :title="activeVideo?.feature || t('homepage.tutorials.watch')"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowfullscreen
                  referrerpolicy="strict-origin-when-cross-origin"
                ></iframe>
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
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Modal from 'bootstrap/js/dist/modal'
import { RTL_LOCALES } from '../i18n.js'
import {
  TUTORIALS_PAGE_PATH,
  tutorialThumbnailUrl,
  tutorialVideosInOrder,
} from '../config/tutorialVideos.js'
import { youtubeNoCookieEmbedSrc } from '../scripts/seo/youtubeEmbed.js'

const DRAG_THRESHOLD = 6
const EDGE_EPSILON = 8

export default {
  name: 'TutorialCarousel',
  setup() {
    const { t, locale } = useI18n()
    const videos = tutorialVideosInOrder()
    const tutorialsPath = TUTORIALS_PAGE_PATH
    const titleId = 'tutorial-video-title'
    const trackRef = ref(null)
    const modalRef = ref(null)
    const atStart = ref(true)
    const atEnd = ref(false)
    const dragging = ref(false)
    const activeVideo = ref(null)
    const playerSrc = ref('')
    const playable = ref(true)
    const failedThumbs = ref({})

    const isRtl = computed(() => RTL_LOCALES.includes(locale.value))

    let modal = null
    let opener = null
    let pointer = null
    let blockClick = false
    let reduceMotionQuery = null
    let resizeObserver = null
    let scrollFrame = 0
    let scrollEndTimer = 0
    let animating = false
    let plannedIndex = 0

    const prefersReducedMotion = () => reduceMotionQuery?.matches === true
    const scrollBehavior = () => (prefersReducedMotion() ? 'auto' : 'smooth')

    const thumbSrc = (video) => (
      failedThumbs.value[video.id] ? '' : tutorialThumbnailUrl(video.id)
    )

    const onThumbError = (id) => {
      failedThumbs.value = { ...failedThumbs.value, [id]: true }
    }

    const cards = () => [...(trackRef.value?.querySelectorAll('[data-tutorial-card]') || [])]

    const updateBounds = () => {
      const track = trackRef.value
      const items = cards()
      if (!track || !items.length) {
        atStart.value = true
        atEnd.value = true
        return
      }
      const view = track.getBoundingClientRect()
      const first = items[0].getBoundingClientRect()
      const last = items[items.length - 1].getBoundingClientRect()
      if (isRtl.value) {
        atStart.value = Math.abs(first.right - view.right) <= EDGE_EPSILON
        atEnd.value = last.left >= view.left - EDGE_EPSILON
      } else {
        atStart.value = Math.abs(first.left - view.left) <= EDGE_EPSILON
        atEnd.value = last.right <= view.right + EDGE_EPSILON
      }
    }

    const nearestCardIndex = () => {
      const track = trackRef.value
      const items = cards()
      if (!track || !items.length) return 0
      const view = track.getBoundingClientRect()
      const rtl = isRtl.value
      let best = 0
      let bestDist = Number.POSITIVE_INFINITY
      items.forEach((card, index) => {
        const rect = card.getBoundingClientRect()
        const dist = rtl
          ? Math.abs(view.right - rect.right)
          : Math.abs(rect.left - view.left)
        if (dist < bestDist) {
          best = index
          bestDist = dist
        }
      })
      return best
    }

    const scrollToCard = (index) => {
      const track = trackRef.value
      const items = cards()
      const card = items[Math.max(0, Math.min(index, items.length - 1))]
      if (!track || !card) return
      const view = track.getBoundingClientRect()
      const rect = card.getBoundingClientRect()
      const delta = isRtl.value ? rect.right - view.right : rect.left - view.left
      const left = isRtl.value ? track.scrollLeft - delta : track.scrollLeft + delta
      track.scrollTo({ left, behavior: scrollBehavior() })
    }

    const settlePlannedIndex = () => {
      animating = false
      plannedIndex = nearestCardIndex()
      updateBounds()
    }

    const step = (direction) => {
      const count = cards().length
      if (!count) return
      const base = animating ? plannedIndex : nearestCardIndex()
      plannedIndex = Math.max(0, Math.min(count - 1, base + direction))
      animating = true
      scrollToCard(plannedIndex)
    }

    const onScroll = () => {
      if (scrollFrame) return
      scrollFrame = window.requestAnimationFrame(() => {
        scrollFrame = 0
        updateBounds()
      })
      window.clearTimeout(scrollEndTimer)
      scrollEndTimer = window.setTimeout(settlePlannedIndex, 140)
    }

    const onKeydown = (event) => {
      if (event.altKey || event.metaKey || event.ctrlKey) return
      const target = event.target
      if (target?.closest?.('input, textarea, select, [contenteditable="true"]')) return
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        step(isRtl.value ? -1 : 1)
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault()
        step(isRtl.value ? 1 : -1)
      } else if (event.key === 'Home') {
        event.preventDefault()
        scrollToCard(0)
      } else if (event.key === 'End') {
        event.preventDefault()
        scrollToCard(videos.length - 1)
      }
    }

    const onPointerDown = (event) => {
      if (event.pointerType !== 'mouse' || event.button !== 0) return
      const track = trackRef.value
      if (!track) return
      pointer = {
        id: event.pointerId,
        x: event.clientX,
        scroll: track.scrollLeft,
        moved: false,
      }
    }

    const onPointerMove = (event) => {
      if (!pointer || event.pointerId !== pointer.id) return
      const dx = event.clientX - pointer.x
      if (!pointer.moved && Math.abs(dx) < DRAG_THRESHOLD) return
      const track = trackRef.value
      if (!track) return
      if (!pointer.moved) {
        pointer.moved = true
        dragging.value = true
        track.setPointerCapture?.(event.pointerId)
      }
      event.preventDefault()
      track.scrollLeft = pointer.scroll + (isRtl.value ? dx : -dx)
    }

    const onPointerUp = (event) => {
      if (!pointer || event.pointerId !== pointer.id) return
      const moved = pointer.moved
      const index = nearestCardIndex()
      pointer = null
      dragging.value = false
      if (!moved) return
      blockClick = true
      animating = false
      plannedIndex = index
      scrollToCard(index)
      window.setTimeout(() => {
        blockClick = false
      }, 80)
    }

    const onTrackClick = (event) => {
      if (!blockClick) return
      event.preventDefault()
      event.stopPropagation()
      blockClick = false
    }

    const openVideo = (video, event) => {
      if (blockClick) return
      const src = youtubeNoCookieEmbedSrc(video.id)
      activeVideo.value = video
      playable.value = Boolean(src)
      playerSrc.value = src
      opener = event.currentTarget
      nextTick(() => modal?.show())
    }

    const onModalHide = () => {
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
    }

    const onMotionChange = () => {
      updateBounds()
    }

    onMounted(() => {
      reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
      reduceMotionQuery.addEventListener?.('change', onMotionChange)

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

      const track = trackRef.value
      if (track && 'ResizeObserver' in window) {
        resizeObserver = new ResizeObserver(() => updateBounds())
        resizeObserver.observe(track)
      }
      updateBounds()
    })

    onBeforeUnmount(() => {
      reduceMotionQuery?.removeEventListener?.('change', onMotionChange)
      if (scrollFrame) window.cancelAnimationFrame(scrollFrame)
      window.clearTimeout(scrollEndTimer)
      resizeObserver?.disconnect()
      const el = modalRef.value
      el?.removeEventListener('hide.bs.modal', onModalHide)
      el?.removeEventListener('hidden.bs.modal', onModalHidden)
      el?.removeEventListener('shown.bs.modal', onModalShown)
      modal?.dispose()
      modal = null
      document.querySelectorAll('.tutorials-modal-backdrop').forEach((node) => node.remove())
    })

    watch(locale, async () => {
      await nextTick()
      updateBounds()
    })

    return {
      t,
      videos,
      tutorialsPath,
      titleId,
      trackRef,
      modalRef,
      atStart,
      atEnd,
      dragging,
      activeVideo,
      playerSrc,
      playable,
      isRtl,
      thumbSrc,
      onThumbError,
      onScroll,
      onKeydown,
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onTrackClick,
      openVideo,
      step,
    }
  },
}
</script>

<style scoped>
.tutorials {
  --tutorial-ease: cubic-bezier(0.16, 1, 0.3, 1);
  background: #f3efe8;
}

.wrap {
  width: min(1240px, 100%);
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
}

.tutorials__intro .section-title {
  margin-bottom: 0.55rem;
  font-size: clamp(1.7rem, 2.8vw, 2.2rem);
}

.tutorials__intro .section-sub {
  max-width: 38rem;
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

.tutorials__stage {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  grid-template-areas: "prev track next";
  align-items: center;
  gap: 0.55rem;
  min-width: 0;
}

.tutorials__arrow--prev { grid-area: prev; }
.tutorials__arrow--next { grid-area: next; }

.tutorials__arrow {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.35rem;
  height: 2.35rem;
  flex: 0 0 auto;
  border: 1px solid color-mix(in srgb, var(--accent) 18%, var(--border));
  border-radius: 999px;
  background: color-mix(in srgb, var(--surface-strong) 88%, var(--bg));
  color: var(--text);
  cursor: pointer;
  transition: border-color 0.25s var(--ease, ease), color 0.25s var(--ease, ease), background 0.25s ease;
}

.tutorials__arrow:hover:not(:disabled) {
  border-color: color-mix(in srgb, var(--accent) 42%, var(--border));
  background: color-mix(in srgb, var(--accent-light) 55%, var(--surface-strong));
  color: var(--accent-strong);
}

.tutorials__arrow:disabled {
  opacity: 0.38;
  cursor: default;
}

.tutorials__arrow:focus-visible,
.tutorials__track:focus-visible {
  outline: 2px solid var(--focus-ring-color, var(--accent));
  outline-offset: 3px;
}

.tutorials__open:focus-visible {
  outline: 2px solid var(--focus-ring-color, var(--accent));
  outline-offset: -3px;
}

.tutorials__track {
  --tutorial-gap: 0.9rem;
  grid-area: track;
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 100%;
  gap: var(--tutorial-gap);
  min-width: 0;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
  -ms-overflow-style: none;
  border-radius: 0.4rem;
}

.tutorials__track::-webkit-scrollbar {
  display: none;
}

.tutorials__track.is-dragging {
  scroll-snap-type: none;
  scroll-behavior: auto;
  cursor: grabbing;
}

.tutorials__track.is-dragging .tutorials__open {
  cursor: grabbing;
}

.tutorials__card {
  min-width: 0;
  scroll-snap-align: start;
  scroll-snap-stop: always;
}

.tutorials__heading {
  height: 100%;
  margin: 0;
  font: inherit;
}

.tutorials__open {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
  border: 1px solid rgba(78, 58, 38, 0.12);
  border-radius: 1.05rem;
  background: #fff;
  color: inherit;
  font: inherit;
  text-align: start;
  cursor: pointer;
  box-shadow: 0 10px 24px -20px rgba(45, 32, 20, 0.35);
  transition:
    border-color 0.4s var(--tutorial-ease),
    background 0.4s var(--tutorial-ease),
    transform 0.45s var(--tutorial-ease),
    box-shadow 0.45s var(--tutorial-ease);
}

.tutorials__open:hover {
  border-color: rgba(139, 94, 60, 0.38);
  background: #fff;
  transform: translateY(-6px);
  box-shadow: 0 22px 36px -22px rgba(45, 32, 20, 0.4);
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

@media (min-width: 768px) {
  .tutorials__head {
    flex-direction: row;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1.25rem;
    text-align: start;
  }

  .tutorials__intro {
    max-width: 40rem;
  }

  .tutorials__intro .section-sub {
    margin-inline: 0;
  }

  .tutorials__all {
    margin-top: 0.4rem;
  }

  .tutorials__track {
    grid-auto-columns: calc((100% - (2 * var(--tutorial-gap))) / 3);
  }
}

@media (min-width: 1200px) {
  .tutorials__track {
    grid-auto-columns: calc((100% - (2 * var(--tutorial-gap))) / 3);
  }
}

@media (max-width: 767.98px) {
  .tutorials__stage {
    grid-template-columns: auto auto;
    grid-template-areas:
      "track track"
      "prev next";
    justify-content: center;
    column-gap: 0.65rem;
    row-gap: 0.75rem;
  }
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
  .tutorials__arrow,
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

.tutorials-modal__frame {
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
  background: #f3efe8;
}

.homepage[data-theme="light"] .tutorials__open,
.homepage:not([data-theme]) .tutorials__open {
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

.homepage[data-theme="light"] .tutorials__arrow,
.homepage:not([data-theme]) .tutorials__arrow,
.homepage[data-theme="light"] .tutorials__all,
.homepage:not([data-theme]) .tutorials__all {
  background: #fff;
  border-color: rgba(78, 58, 38, 0.16);
  color: #6f4a2e;
}

.homepage[data-theme="sepia"] .tutorials {
  background: #efe4cc;
}

.homepage[data-theme="sepia"] .tutorials__open {
  background: #fbf6ea;
  border-color: #d9cbb0;
  box-shadow: 0 12px 24px -20px rgba(80, 56, 28, 0.35);
}

.homepage[data-theme="sepia"] .tutorials__open:hover {
  background: #fffaf0;
  border-color: #c4ad8c;
}

.homepage[data-theme="sepia"] .tutorials__feature {
  color: #3b2f20;
}

.homepage[data-theme="sepia"] .tutorials__tagline {
  color: #6b5b45;
}

.homepage[data-theme="sepia"] .tutorials__arrow,
.homepage[data-theme="sepia"] .tutorials__all {
  background: #fbf6ea;
  border-color: #d9cbb0;
  color: #6f4a2e;
}

.homepage[data-theme="sepia"] .tutorials__media {
  background: #e7dcc4;
}

.homepage[data-theme="dark"] .tutorials {
  background: #14110f;
}

.homepage[data-theme="dark"] .tutorials__open {
  background: #221e1a;
  border-color: rgba(255, 255, 255, 0.1);
  box-shadow: 0 16px 28px -22px rgba(0, 0, 0, 0.7);
}

.homepage[data-theme="dark"] .tutorials__open:hover {
  background: #2a241f;
  border-color: rgba(232, 191, 143, 0.45);
}

.homepage[data-theme="dark"] .tutorials__feature {
  color: rgba(255, 255, 255, 0.96);
}

.homepage[data-theme="dark"] .tutorials__tagline {
  color: rgba(255, 255, 255, 0.72);
}

.homepage[data-theme="dark"] .tutorials__all,
.homepage[data-theme="dark"] .tutorials__arrow {
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
