<template>
  <section
    id="testimonials"
    class="testimonials"
    aria-labelledby="testimonials-title"
    @keydown="onKeydown"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
    @focusin="onFocusIn"
    @focusout="onFocusOut"
  >
    <div class="wrap">
      <header class="testimonials__head" data-reveal>
        <h2 id="testimonials-title" class="section-title">{{ t('homepage.testimonials.title') }}</h2>
        <p class="section-sub">{{ t('homepage.testimonials.subtitle') }}</p>
      </header>

      <div class="testimonials__stage" data-reveal>
        <button
          type="button"
          class="testimonials__arrow testimonials__arrow--prev"
          :disabled="atStart"
          :aria-label="t('homepage.testimonials.previous')"
          aria-controls="testimonials-track"
          @click="step(-1)"
        >
          <i class="bi" :class="isRtl ? 'bi-chevron-right' : 'bi-chevron-left'" aria-hidden="true"></i>
        </button>

        <div
          id="testimonials-track"
          ref="trackRef"
          class="testimonials__track"
          :class="{ 'is-dragging': dragging, 'is-animating': animating }"
          role="region"
          tabindex="0"
          :aria-label="t('homepage.testimonials.regionLabel')"
          aria-roledescription="carousel"
          @scroll.passive="onScroll"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointercancel="onPointerUp"
        >
          <article
            v-for="(item, index) in items"
            :key="item.id"
            class="testimonials__card"
            data-testimonial-card
            lang="en"
            aria-roledescription="slide"
            :aria-posinset="index + 1"
            :aria-setsize="items.length"
          >
            <i class="bi bi-quote testimonials__mark" aria-hidden="true"></i>
            <blockquote class="testimonials__quote">
              <p>{{ item.quote }}</p>
            </blockquote>
            <footer class="testimonials__person">
              <span class="testimonials__avatar" aria-hidden="true">{{ testimonialInitials(item.name) }}</span>
              <span class="testimonials__identity">
                <span class="testimonials__name">{{ item.name }}</span>
                <span class="testimonials__role">{{ item.role }}</span>
              </span>
            </footer>
          </article>
        </div>

        <button
          type="button"
          class="testimonials__arrow testimonials__arrow--next"
          :disabled="atEnd"
          :aria-label="t('homepage.testimonials.next')"
          aria-controls="testimonials-track"
          @click="step(1)"
        >
          <i class="bi" :class="isRtl ? 'bi-chevron-left' : 'bi-chevron-right'" aria-hidden="true"></i>
        </button>
      </div>
    </div>
  </section>
</template>

<script>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { RTL_LOCALES } from '../i18n.js'
import { TESTIMONIALS, testimonialInitials } from '../config/testimonials.js'

const DRAG_THRESHOLD = 8
const EDGE_EPSILON = 8
const SCROLL_MS = 520
const AUTOPLAY_MS = 7000

const easeOut = (t) => 1 - ((1 - t) ** 3)

export default {
  name: 'TestimonialsCarousel',
  props: {
    autoplay: { type: Boolean, default: false },
  },
  setup(props) {
    const { t, locale } = useI18n()
    const items = TESTIMONIALS
    const trackRef = ref(null)
    const atStart = ref(true)
    const atEnd = ref(false)
    const dragging = ref(false)
    const animating = ref(false)
    const isRtl = computed(() => RTL_LOCALES.includes(locale.value))

    let pointer = null
    let reduceMotionQuery = null
    let resizeObserver = null
    let scrollFrame = 0
    let animFrame = 0
    let autoplayTimer = 0
    let hovering = false
    let focusInside = false
    let interacting = false

    const prefersReducedMotion = () => reduceMotionQuery?.matches === true

    const cards = () => [...(trackRef.value?.querySelectorAll('[data-testimonial-card]') || [])]

    const updateBounds = () => {
      const track = trackRef.value
      const list = cards()
      if (!track || !list.length) {
        atStart.value = true
        atEnd.value = true
        return
      }
      const view = track.getBoundingClientRect()
      const first = list[0].getBoundingClientRect()
      const last = list[list.length - 1].getBoundingClientRect()
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
      const list = cards()
      if (!track || !list.length) return 0
      const view = track.getBoundingClientRect()
      const rtl = isRtl.value
      let best = 0
      let bestDist = Number.POSITIVE_INFINITY
      list.forEach((card, index) => {
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

    const scrollDeltaFor = (index) => {
      const track = trackRef.value
      const card = cards()[index]
      if (!track || !card) return 0
      const view = track.getBoundingClientRect()
      const rect = card.getBoundingClientRect()
      const visual = isRtl.value ? rect.right - view.right : rect.left - view.left
      return isRtl.value ? -visual : visual
    }

    const cancelAnim = () => {
      if (animFrame) {
        window.cancelAnimationFrame(animFrame)
        animFrame = 0
      }
      animating.value = false
    }

    const clearAutoplay = () => {
      if (autoplayTimer) {
        window.clearTimeout(autoplayTimer)
        autoplayTimer = 0
      }
    }

    const autoplayBlocked = () => (
      !props.autoplay
      || hovering
      || focusInside
      || interacting
      || dragging.value
      || prefersReducedMotion()
      || atEnd.value
    )

    const scheduleAutoplay = () => {
      clearAutoplay()
      if (autoplayBlocked()) return
      autoplayTimer = window.setTimeout(() => {
        autoplayTimer = 0
        if (autoplayBlocked()) return
        step(1)
      }, AUTOPLAY_MS)
    }

    const animateBy = (delta, index) => {
      const track = trackRef.value
      if (!track) return
      cancelAnim()
      const finish = () => {
        const remain = scrollDeltaFor(index)
        if (Math.abs(remain) > 0.5 && Math.abs(remain) <= 32) {
          track.scrollBy({ left: remain, behavior: 'auto' })
        }
        updateBounds()
        scheduleAutoplay()
      }
      if (Math.abs(delta) < 1 || prefersReducedMotion()) {
        if (Math.abs(delta) >= 1) track.scrollBy({ left: delta, behavior: 'auto' })
        finish()
        return
      }

      let consumed = 0
      const started = performance.now()
      animating.value = true

      const tick = (now) => {
        const progress = Math.min(1, (now - started) / SCROLL_MS)
        const target = delta * easeOut(progress)
        const frameDelta = target - consumed
        consumed = target
        if (frameDelta) track.scrollBy({ left: frameDelta, behavior: 'auto' })
        if (progress < 1) {
          animFrame = window.requestAnimationFrame(tick)
          return
        }
        animFrame = 0
        animating.value = false
        finish()
      }

      animFrame = window.requestAnimationFrame(tick)
    }

    const scrollToCard = (index) => {
      const list = cards()
      const next = Math.min(list.length - 1, Math.max(0, index))
      animateBy(scrollDeltaFor(next), next)
    }

    const step = (direction) => {
      if (!direction) return
      if (direction > 0 && atEnd.value) return
      if (direction < 0 && atStart.value) return
      clearAutoplay()
      scrollToCard(nearestCardIndex() + direction)
    }

    const onScroll = () => {
      if (scrollFrame) return
      scrollFrame = window.requestAnimationFrame(() => {
        scrollFrame = 0
        updateBounds()
      })
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
        scrollToCard(items.length - 1)
      }
    }

    const onPointerDown = (event) => {
      interacting = true
      clearAutoplay()
      if (event.pointerType !== 'mouse' || event.button !== 0) return
      const track = trackRef.value
      if (!track) return
      cancelAnim()
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
      if (pointer && event.pointerId !== pointer.id) return
      const moved = Boolean(pointer?.moved)
      const index = nearestCardIndex()
      pointer = null
      dragging.value = false
      interacting = false
      if (moved) {
        scrollToCard(index)
        return
      }
      scheduleAutoplay()
    }

    const onMouseEnter = () => {
      hovering = true
      clearAutoplay()
    }

    const onMouseLeave = () => {
      hovering = false
      scheduleAutoplay()
    }

    const onFocusIn = () => {
      focusInside = true
      clearAutoplay()
    }

    const onFocusOut = (event) => {
      const next = event.relatedTarget
      if (next && event.currentTarget?.contains?.(next)) return
      focusInside = false
      scheduleAutoplay()
    }

    const onMotionChange = () => {
      cancelAnim()
      updateBounds()
      scheduleAutoplay()
    }

    onMounted(() => {
      reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
      reduceMotionQuery.addEventListener?.('change', onMotionChange)
      const track = trackRef.value
      if (track && 'ResizeObserver' in window) {
        resizeObserver = new ResizeObserver(() => updateBounds())
        resizeObserver.observe(track)
      }
      updateBounds()
      scheduleAutoplay()
    })

    onBeforeUnmount(() => {
      reduceMotionQuery?.removeEventListener?.('change', onMotionChange)
      if (scrollFrame) window.cancelAnimationFrame(scrollFrame)
      cancelAnim()
      clearAutoplay()
      resizeObserver?.disconnect()
    })

    watch(locale, async () => {
      await nextTick()
      updateBounds()
    })

    return {
      t,
      items,
      trackRef,
      atStart,
      atEnd,
      dragging,
      animating,
      isRtl,
      testimonialInitials,
      onScroll,
      onKeydown,
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onMouseEnter,
      onMouseLeave,
      onFocusIn,
      onFocusOut,
      step,
    }
  },
}
</script>

<style scoped>
.testimonials {
  min-width: 0;
  color: var(--text);
  font-family: "Nunito", var(--hp-text, var(--font-ui));
  background: transparent;
}

.wrap {
  width: min(1240px, 100%);
  padding-block: clamp(2.6rem, 5.4vw, 4.25rem);
}

.testimonials__head {
  margin-bottom: clamp(1.6rem, 3vw, 2.2rem);
  text-align: center;
}

.testimonials__head .section-title {
  margin-bottom: 0.55rem;
  font-size: clamp(1.7rem, 2.8vw, 2.2rem);
}

.testimonials__head .section-sub {
  max-width: 36rem;
}

.testimonials__stage {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  grid-template-areas: "prev track next";
  align-items: center;
  gap: 0.55rem;
  min-width: 0;
}

.testimonials__arrow--prev { grid-area: prev; }
.testimonials__arrow--next { grid-area: next; }
.testimonials__track { grid-area: track; }

.testimonials__arrow {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  align-self: center;
  width: 2.25rem;
  height: 2.25rem;
  flex: 0 0 auto;
  border: 1px solid color-mix(in srgb, var(--accent) 18%, var(--border));
  border-radius: 999px;
  background: color-mix(in srgb, var(--surface-strong) 88%, var(--bg));
  color: var(--text);
  cursor: pointer;
  transition:
    border-color 0.45s var(--ease, ease),
    color 0.45s var(--ease, ease),
    background-color 0.45s var(--ease, ease),
    opacity 0.45s var(--ease, ease);
}

.testimonials__arrow:hover:not(:disabled) {
  border-color: color-mix(in srgb, var(--accent) 42%, var(--border));
  background: color-mix(in srgb, var(--accent-light) 55%, var(--surface-strong));
  color: var(--accent-strong);
}

.testimonials__arrow:disabled {
  opacity: 0.38;
  cursor: default;
}

.testimonials__arrow:focus-visible,
.testimonials__track:focus-visible {
  outline: 2px solid var(--focus-ring-color, var(--accent));
  outline-offset: 3px;
}

.testimonials__track {
  --testimonial-gap: 1.05rem;
  --testimonial-peek: 1.35rem;
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: calc(100% - var(--testimonial-gap) - var(--testimonial-peek));
  align-items: stretch;
  gap: var(--testimonial-gap);
  min-width: 0;
  padding-block: 0.7rem;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  scroll-snap-type: x mandatory;
  scroll-behavior: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.testimonials__track::-webkit-scrollbar {
  display: none;
}

.testimonials__track.is-dragging,
.testimonials__track.is-animating {
  scroll-snap-type: none;
}

.testimonials__track.is-dragging {
  cursor: grabbing;
  user-select: none;
}

.testimonials__card {
  display: flex;
  flex-direction: column;
  min-width: 0;
  height: 100%;
  padding: 1.45rem 1.4rem 1.3rem;
  border: 1px solid color-mix(in srgb, var(--border) 62%, transparent);
  border-radius: 1.25rem;
  background: var(--surface-strong);
  box-shadow:
    0 1px 2px color-mix(in srgb, var(--text) 4%, transparent),
    0 14px 28px -18px color-mix(in srgb, var(--text) 16%, transparent);
  scroll-snap-align: start;
  scroll-snap-stop: normal;
  transition:
    transform 0.45s var(--ease, ease),
    border-color 0.45s var(--ease, ease),
    background-color 0.45s var(--ease, ease),
    box-shadow 0.45s var(--ease, ease),
    color 0.45s var(--ease, ease);
}

.testimonials__card:hover {
  transform: translateY(-2px);
  border-color: color-mix(in srgb, var(--accent) 36%, var(--border));
  box-shadow:
    0 1px 2px color-mix(in srgb, var(--text) 5%, transparent),
    0 14px 26px -14px color-mix(in srgb, var(--text) 18%, transparent);
}

.testimonials__track.is-dragging .testimonials__card,
.testimonials__track.is-dragging .testimonials__card:hover {
  transform: none;
}

.testimonials__mark {
  display: block;
  width: fit-content;
  margin-bottom: 0.15rem;
  color: color-mix(in srgb, var(--accent) 72%, var(--accent-strong));
  font-size: 1.35rem;
  line-height: 1;
}

.testimonials__quote {
  flex: 1 1 auto;
  margin: 0.55rem 0 0;
}

.testimonials__quote p {
  margin: 0;
  color: var(--text);
  font-family: "Cormorant Garamond", "Source Serif 4", Georgia, serif;
  font-size: clamp(1.22rem, 1.5vw, 1.42rem);
  font-weight: 500;
  letter-spacing: -0.01em;
  line-height: 1.38;
  overflow-wrap: break-word;
}

.testimonials__person {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: auto;
  padding-top: 1.2rem;
}

.testimonials__avatar {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 2rem;
  height: 2rem;
  border: 1px solid color-mix(in srgb, var(--accent) 28%, transparent);
  border-radius: 999px;
  background: var(--accent-light);
  color: var(--accent-strong);
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1;
}

.testimonials__identity {
  display: flex;
  flex-direction: column;
  gap: 0.08rem;
  min-width: 0;
}

.testimonials__name,
.testimonials__role {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.testimonials__name {
  color: var(--text);
  font-family: "Nunito", var(--hp-text, var(--font-ui));
  font-size: 0.92rem;
  font-weight: 700;
  line-height: 1.25;
}

.testimonials__role {
  color: var(--text-muted);
  font-size: 0.8rem;
  font-weight: 550;
  line-height: 1.3;
}


@media (max-width: 767.98px) {
  .wrap {
    padding-block: 2.15rem 2.4rem;
  }

  .testimonials__card {
    padding: 1.25rem 1.15rem 1.15rem;
  }

  .testimonials__stage {
    grid-template-columns: auto auto;
    grid-template-areas:
      "track track"
      "prev next";
    justify-content: center;
    column-gap: 0.55rem;
    row-gap: 0.7rem;
  }

  .testimonials__arrow {
    width: 2rem;
    height: 2rem;
  }

  .testimonials__quote p {
    font-size: 1.28rem;
    line-height: 1.35;
  }

  .testimonials__card:last-child {
    scroll-snap-align: end;
  }
}

@media (min-width: 768px) {
  .testimonials__card {
    padding: 1.5rem 1.4rem 1.35rem;
  }

  .testimonials__track {
    grid-auto-columns: calc((100% - var(--testimonial-gap)) / 2);
  }
}

@media (min-width: 1200px) {
  .testimonials__track {
    grid-auto-columns: calc((100% - (2 * var(--testimonial-gap))) / 3);
  }
}

@media (prefers-reduced-motion: reduce) {
  .testimonials__track {
    scroll-behavior: auto;
  }

  .testimonials__card,
  .testimonials__card:hover,
  .testimonials__arrow,
  .testimonials__mark,
  .testimonials__quote p,
  .testimonials__name,
  .testimonials__role,
  .testimonials__avatar {
    transition: none;
    animation: none;
  }

  .testimonials__card,
  .testimonials__card:hover {
    transform: none;
  }
}

</style>

<style>
.homepage[data-theme="light"] .testimonials__card,
.homepage:not([data-theme]) .testimonials__card {
  background: var(--surface-strong);
  border-color: color-mix(in srgb, var(--border) 55%, transparent);
  box-shadow:
    0 1px 2px rgba(45, 32, 20, 0.04),
    0 10px 22px -16px rgba(45, 32, 20, 0.12);
}

.homepage[data-theme="light"] .testimonials__card:hover,
.homepage:not([data-theme]) .testimonials__card:hover {
  border-color: color-mix(in srgb, var(--accent) 34%, var(--border));
  box-shadow:
    0 1px 2px rgba(45, 32, 20, 0.05),
    0 14px 26px -14px rgba(45, 32, 20, 0.16);
}

.homepage[data-theme="sepia"] .testimonials__card {
  background: color-mix(in srgb, var(--surface-strong) 74%, var(--surface-soft));
  border-color: color-mix(in srgb, var(--border) 88%, var(--bg));
  box-shadow:
    0 1px 2px rgba(80, 56, 28, 0.05),
    0 10px 22px -16px rgba(80, 56, 28, 0.14);
}

.homepage[data-theme="sepia"] .testimonials__card:hover {
  border-color: color-mix(in srgb, var(--accent) 42%, var(--border));
  box-shadow:
    0 1px 2px rgba(80, 56, 28, 0.06),
    0 14px 26px -14px rgba(80, 56, 28, 0.18);
}

.homepage[data-theme="dark"] .testimonials__card {
  background: #241f1b;
  border-color: rgba(255, 255, 255, 0.12);
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.28),
    0 16px 28px -18px rgba(0, 0, 0, 0.55);
}

.homepage[data-theme="dark"] .testimonials__card:hover {
  border-color: rgba(212, 165, 116, 0.45);
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.36),
    0 18px 32px -16px rgba(0, 0, 0, 0.62);
}

.homepage[data-theme="dark"] .testimonials__quote p,
.homepage[data-theme="dark"] .testimonials__name {
  color: rgba(255, 255, 255, 0.94);
}

.homepage[data-theme="dark"] .testimonials__role {
  color: rgba(255, 255, 255, 0.7);
}

.homepage[data-theme="dark"] .testimonials__mark {
  color: #e8bf8f;
}

.homepage[data-theme="dark"] .testimonials__avatar {
  background: rgba(212, 165, 116, 0.16);
  border-color: rgba(212, 165, 116, 0.4);
  color: #e8bf8f;
}

html[dir="rtl"] .testimonials__mark {
  transform: scaleX(-1);
}
</style>
