<template>
  <section
    v-if="showCommunity || canShare"
    ref="sectionRef"
    :id="showCommunity ? 'testimonials' : undefined"
    class="testimonials"
    :class="{ 'testimonials--invite': !showCommunity }"
    :aria-labelledby="showCommunity ? 'testimonials-title' : 'testimonial-share-title'"
    @keydown="onKeydown"
  >
    <div class="wrap">
      <header v-if="showCommunity" class="testimonials__head" data-reveal>
        <h2 id="testimonials-title" class="section-title">{{ t('homepage.testimonials.title') }}</h2>
        <p class="section-sub">{{ t('homepage.testimonials.subtitle') }}</p>
      </header>

      <p v-if="showingPreview" class="testimonials__preview" role="note">
        {{ t('homepage.testimonials.previewNote') }}
      </p>

      <div v-if="showCommunity" class="testimonials__stage" data-reveal>
        <button
          type="button"
          class="testimonials__arrow testimonials__arrow--prev"
          :disabled="atStart"
          :aria-label="t('homepage.testimonials.previous')"
          aria-controls="testimonials-track"
          @click="step(-1, 'arrow')"
        >
          <i class="bi" :class="isRtl ? 'bi-chevron-right' : 'bi-chevron-left'" aria-hidden="true"></i>
        </button>

        <div
          id="testimonials-track"
          ref="trackRef"
          class="testimonials__track"
          :class="{ 'is-dragging': dragging, 'is-animating': animating }"
          :style="{ '--testimonial-columns': String(visibleColumns) }"
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
            :data-testimonial-id="item.id"
            :data-testimonial-position="index + 1"
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
              <img
                v-if="avatarSrc(item)"
                class="testimonials__photo"
                :src="avatarSrc(item)"
                alt=""
                width="32"
                height="32"
                decoding="async"
              >
              <span v-else class="testimonials__avatar" aria-hidden="true">{{ testimonialInitials(item.name) }}</span>
              <span class="testimonials__identity">
                <span class="testimonials__name">{{ item.name }}</span>
                <span v-if="item.role" class="testimonials__role">{{ item.role }}</span>
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
          @click="step(1, 'arrow')"
        >
          <i class="bi" :class="isRtl ? 'bi-chevron-left' : 'bi-chevron-right'" aria-hidden="true"></i>
        </button>

        <div
          v-if="stopCount > 1"
          class="testimonials__progress"
          role="group"
          :aria-label="t('homepage.testimonials.progressLabel')"
        >
          <button
            v-for="index in stopCount"
            :key="index"
            type="button"
            class="testimonials__dot"
            :aria-current="index - 1 === activeStop ? 'true' : undefined"
            :aria-label="t('homepage.testimonials.goTo', { position: index })"
            @click="goToStop(index - 1)"
          ></button>
        </div>
      </div>

      <div v-if="showCommunity && showMemorisationCta" class="testimonials__cta">
        <h3>{{ t('homepage.testimonials.ctaTitle') }}</h3>
        <p>{{ t('homepage.testimonials.ctaText') }}</p>
        <a
          class="btn btn--primary"
          :href="cta.href"
          :data-public-register="cta.register ? '1' : null"
          @click="onCtaClick"
        >
          <span>{{ t('homepage.testimonials.ctaAction') }}</span>
          <i class="bi" :class="isRtl ? 'bi-arrow-left' : 'bi-arrow-right'" aria-hidden="true"></i>
        </a>
      </div>

      <div v-if="canShare" class="testimonials__share">
        <p
          v-if="shareDone"
          class="testimonials__share-status"
          role="status"
          :id="showCommunity ? undefined : 'testimonial-share-title'"
        >
          {{ t('homepage.testimonials.success') }}
        </p>
        <button
          v-else-if="!shareOpen"
          type="button"
          class="testimonials__share-toggle"
          :id="showCommunity ? undefined : 'testimonial-share-title'"
          @click="shareOpen = true"
        >
          {{ t('homepage.testimonials.share') }}
        </button>
        <form v-else class="testimonials__form" @submit.prevent="submitShare">
          <p
            class="testimonials__share-lead"
            :id="showCommunity ? undefined : 'testimonial-share-title'"
          >{{ t('homepage.testimonials.shareLead') }}</p>
          <label class="testimonials__field">
            <span>{{ t('homepage.testimonials.quoteLabel') }}</span>
            <textarea
              v-model="shareForm.quote"
              rows="4"
              maxlength="5000"
              required
              :disabled="shareSending"
              :placeholder="t('homepage.testimonials.quotePlaceholder')"
            ></textarea>
          </label>
          <label class="testimonials__field">
            <span>{{ t('homepage.testimonials.nameLabel') }}</span>
            <input
              v-model="shareForm.name"
              type="text"
              maxlength="40"
              autocomplete="off"
              :disabled="shareSending"
              :placeholder="t('homepage.testimonials.namePlaceholder')"
            >
          </label>
          <label class="testimonials__field">
            <span>{{ t('homepage.testimonials.roleLabel') }}</span>
            <input
              v-model="shareForm.role"
              type="text"
              maxlength="48"
              autocomplete="off"
              :disabled="shareSending"
              :placeholder="t('homepage.testimonials.rolePlaceholder')"
            >
          </label>
          <label class="testimonials__check">
            <input v-model="shareForm.consent" type="checkbox" :disabled="shareSending">
            <span>{{ t('homepage.testimonials.consent') }}</span>
          </label>
          <p v-if="shareError" class="testimonials__form-error" role="alert">{{ shareError }}</p>
          <div class="testimonials__form-actions">
            <button type="button" class="btn btn--secondary" :disabled="shareSending" @click="shareOpen = false">
              {{ t('homepage.testimonials.shareClose') }}
            </button>
            <button type="submit" class="btn btn--primary" :disabled="shareSending">
              {{ shareSending ? t('homepage.testimonials.submitting') : t('homepage.testimonials.submit') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </section>
</template>

<script>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { RTL_LOCALES } from '../i18n.js'
import {
  localTestimonialPreviewRequested,
  previewTestimonials,
  publicTestimonials,
  testimonialImageSrc,
  testimonialInitials,
} from '../config/testimonials.js'
import { publicRegisterHref } from '../scripts/analytics/registerLinks.js'
import {
  trackTestimonialCta,
  trackTestimonialImpression,
  trackTestimonialNavigation,
  trackTestimonialSectionView,
} from '../scripts/analytics/testimonialAnalytics.js'

const DRAG_THRESHOLD = 8
const EDGE_EPSILON = 8
const SCROLL_MS = 520
const AUTOPLAY_MS = 7000
const COLUMN_TWO = 640
const COLUMN_FOUR = 1024

const easeOut = (t) => 1 - ((1 - t) ** 3)

export default {
  name: 'TestimonialsCarousel',
  props: {
    autoplay: { type: Boolean, default: false },
  },
  setup(props) {
    const { t, locale } = useI18n()
    const usePreview = localTestimonialPreviewRequested()
    const publishedItems = publicTestimonials()
    const items = computed(() => {
      if (publishedItems.length) return publishedItems
      if (usePreview) return previewTestimonials()
      return []
    })
    const showingPreview = computed(() => usePreview && !publishedItems.length && items.value.length > 0)
    const showCommunity = computed(() => items.value.length > 0)
    const canShare = ref(typeof window !== 'undefined' && Boolean(window.mutqinAuthCheck))
    const showMemorisationCta = typeof window === 'undefined' || !window.mutqinRestrictMarketingHost
    const cta = computed(() => {
      const isAuthenticated = typeof window !== 'undefined' && Boolean(window.mutqinAuthCheck)
      if (isAuthenticated) {
        return {
          destination: 'memorisation',
          href: '/memorisation?journey=ten_minute',
          register: false,
        }
      }
      return {
        destination: 'registration',
        href: publicRegisterHref({ intent: 'first' }),
        register: true,
      }
    })

    const sectionRef = ref(null)
    const trackRef = ref(null)
    const atStart = ref(true)
    const atEnd = ref(false)
    const dragging = ref(false)
    const animating = ref(false)
    const perView = ref(1)
    const activeStop = ref(0)
    const isRtl = computed(() => RTL_LOCALES.includes(locale.value))
    const visibleColumns = computed(() => Math.min(perView.value, Math.max(items.value.length, 1)))
    const stopCount = computed(() => Math.max(1, items.value.length - perView.value + 1))

    const shareOpen = ref(false)
    const shareSending = ref(false)
    const shareDone = ref(false)
    const shareError = ref('')
    const shareForm = reactive({
      quote: '',
      name: '',
      role: '',
      consent: false,
    })

    let pointer = null
    let reduceMotionQuery = null
    let resizeObserver = null
    let wideQuery = null
    let tabletQuery = null
    let scrollFrame = 0
    let animFrame = 0
    let autoplayTimer = 0
    let settledIndex = 0
    let programmaticNav = false
    let sectionObserver = null
    let impressionObserver = null
    let scrollEndTimer = 0
    const supportsScrollEnd = typeof window !== 'undefined' && 'onscrollend' in window

    const prefersReducedMotion = () => reduceMotionQuery?.matches === true
    const cards = () => [...(trackRef.value?.querySelectorAll('[data-testimonial-card]') || [])]
    const avatarSrc = (item) => testimonialImageSrc(item?.image)

    const readPerView = () => {
      const width = trackRef.value?.clientWidth || 0
      if (width >= COLUMN_FOUR) return 4
      if (width >= COLUMN_TWO) return 2
      if (typeof window !== 'undefined' && window.matchMedia('(min-width: 1320px)').matches) return 4
      if (typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches) return 2
      return 1
    }

    const syncPerView = () => {
      perView.value = readPerView()
      activeStop.value = Math.min(stopCount.value - 1, Math.max(0, activeStop.value))
    }

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
      const index = nearestCardIndex()
      activeStop.value = Math.min(stopCount.value - 1, index)
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
        step(1, '')
      }, AUTOPLAY_MS)
    }

    const noteNavigation = (index, method) => {
      if (!method || showingPreview.value) return
      const next = Math.min(items.value.length - 1, Math.max(0, index))
      if (next === settledIndex) return
      settledIndex = next
      const item = items.value[next]
      if (!item) return
      trackTestimonialNavigation({
        id: item.id,
        position: next + 1,
        method,
      })
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
        programmaticNav = false
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

    const scrollToCard = (index, method) => {
      const list = cards()
      const next = Math.min(Math.max(list.length - 1, 0), Math.max(0, index))
      if (method) programmaticNav = true
      noteNavigation(next, method)
      activeStop.value = Math.min(stopCount.value - 1, next)
      animateBy(scrollDeltaFor(next), next)
    }

    const step = (direction, method = 'arrow') => {
      if (!direction) return
      if (direction > 0 && atEnd.value) return
      if (direction < 0 && atStart.value) return
      clearAutoplay()
      scrollToCard(nearestCardIndex() + direction, method)
    }

    const goToStop = (index) => {
      if (index === nearestCardIndex()) return
      clearAutoplay()
      scrollToCard(index, 'dot')
    }

    const onNativeScrollEnd = () => {
      if (animating.value || dragging.value || programmaticNav) return
      const index = nearestCardIndex()
      updateBounds()
      noteNavigation(index, 'swipe')
    }

    const onScroll = () => {
      if (scrollFrame) return
      scrollFrame = window.requestAnimationFrame(() => {
        scrollFrame = 0
        updateBounds()
        if (supportsScrollEnd) return
        if (scrollEndTimer) window.clearTimeout(scrollEndTimer)
        scrollEndTimer = window.setTimeout(() => {
          scrollEndTimer = 0
          onNativeScrollEnd()
        }, 140)
      })
    }

    const onKeydown = (event) => {
      if (!showCommunity.value) return
      if (event.altKey || event.metaKey || event.ctrlKey) return
      const target = event.target
      if (target?.closest?.('input, textarea, select, [contenteditable="true"]')) return
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        step(isRtl.value ? -1 : 1, 'keyboard')
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault()
        step(isRtl.value ? 1 : -1, 'keyboard')
      } else if (event.key === 'Home') {
        event.preventDefault()
        scrollToCard(0, 'keyboard')
      } else if (event.key === 'End') {
        event.preventDefault()
        scrollToCard(items.value.length - 1, 'keyboard')
      }
    }

    const onPointerDown = (event) => {
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
      if (moved) {
        scrollToCard(index, 'drag')
        return
      }
      scheduleAutoplay()
    }

    const onCtaClick = () => {
      if (showingPreview.value) return
      const index = Math.min(items.value.length - 1, Math.max(0, nearestCardIndex()))
      const item = items.value[index]
      if (!item) return
      trackTestimonialCta({
        id: item.id,
        position: index + 1,
        destination: cta.value.destination,
      })
    }

    const submitShare = async () => {
      if (shareSending.value) return
      shareError.value = ''
      const quote = String(shareForm.quote || '').trim()
      const name = String(shareForm.name || '').trim().replace(/\s+/g, ' ')
      const role = String(shareForm.role || '').trim().replace(/\s+/g, ' ')
      if (quote.length < 3) {
        shareError.value = t('homepage.testimonials.error')
        return
      }
      if (name.includes('@') || name.length > 40) {
        shareError.value = t('homepage.testimonials.nameInvalid')
        return
      }
      if (shareForm.consent && !name) {
        shareError.value = t('homepage.testimonials.nameRequired')
        return
      }
      shareSending.value = true
      try {
        if (!window.axios?.post) throw new Error('unavailable')
        await window.axios.post('/api/feedback', {
          type: 'other',
          message: quote,
          context: {
            intent: 'community_testimonial',
            display_name: name,
            role: role.includes('@') ? '' : role,
            publication_consent: Boolean(shareForm.consent),
            route: '/',
            page: 'homepage-testimonials',
          },
        })
        shareDone.value = true
        shareOpen.value = false
      } catch {
        shareError.value = t('homepage.testimonials.error')
      } finally {
        shareSending.value = false
      }
    }

    const observeSection = () => {
      sectionObserver?.disconnect()
      sectionObserver = null
      if (showingPreview.value || !showCommunity.value || typeof IntersectionObserver === 'undefined') return
      const target = sectionRef.value
      if (!target) return
      sectionObserver = new IntersectionObserver((entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return
        trackTestimonialSectionView()
        sectionObserver?.disconnect()
        sectionObserver = null
      }, { threshold: 0.3 })
      sectionObserver.observe(target)
    }

    const observeImpressions = () => {
      impressionObserver?.disconnect()
      impressionObserver = null
      if (showingPreview.value || typeof IntersectionObserver === 'undefined') return
      const root = trackRef.value
      if (!root) return
      impressionObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting || entry.intersectionRatio < 0.55) return
          trackTestimonialImpression({
            id: entry.target.getAttribute('data-testimonial-id'),
            position: Number(entry.target.getAttribute('data-testimonial-position')),
          })
        })
      }, { root, threshold: 0.55 })
      cards().forEach((card) => impressionObserver.observe(card))
    }

    const onMotionChange = () => {
      cancelAnim()
      updateBounds()
      scheduleAutoplay()
    }

    const onResize = () => {
      syncPerView()
      updateBounds()
    }

    onMounted(() => {
      perView.value = readPerView()
      reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
      reduceMotionQuery.addEventListener?.('change', onMotionChange)
      wideQuery = window.matchMedia('(min-width: 1320px)')
      tabletQuery = window.matchMedia('(min-width: 768px)')
      wideQuery.addEventListener?.('change', onResize)
      tabletQuery.addEventListener?.('change', onResize)
      const track = trackRef.value
      if (track && 'ResizeObserver' in window) {
        resizeObserver = new ResizeObserver(() => onResize())
        resizeObserver.observe(track)
      }
      track?.addEventListener?.('scrollend', onNativeScrollEnd)
      updateBounds()
      observeSection()
      observeImpressions()
      scheduleAutoplay()
    })

    onBeforeUnmount(() => {
      reduceMotionQuery?.removeEventListener?.('change', onMotionChange)
      wideQuery?.removeEventListener?.('change', onResize)
      tabletQuery?.removeEventListener?.('change', onResize)
      trackRef.value?.removeEventListener?.('scrollend', onNativeScrollEnd)
      if (scrollFrame) window.cancelAnimationFrame(scrollFrame)
      if (scrollEndTimer) window.clearTimeout(scrollEndTimer)
      cancelAnim()
      clearAutoplay()
      resizeObserver?.disconnect()
      sectionObserver?.disconnect()
      impressionObserver?.disconnect()
    })

    watch(locale, async () => {
      await nextTick()
      updateBounds()
    })

    watch(items, async () => {
      await nextTick()
      syncPerView()
      updateBounds()
      observeSection()
      observeImpressions()
    })

    return {
      t,
      items,
      showingPreview,
      showCommunity,
      canShare,
      showMemorisationCta,
      cta,
      sectionRef,
      trackRef,
      atStart,
      atEnd,
      dragging,
      animating,
      activeStop,
      stopCount,
      visibleColumns,
      isRtl,
      shareOpen,
      shareSending,
      shareDone,
      shareError,
      shareForm,
      testimonialInitials,
      avatarSrc,
      onScroll,
      onKeydown,
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onCtaClick,
      submitShare,
      step,
      goToStop,
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
  padding-block: clamp(2.4rem, 5vw, 3.8rem);
}

.testimonials--invite .wrap {
  padding-block: 1.4rem 1.8rem;
}

.testimonials__head {
  margin-bottom: clamp(1.25rem, 2.6vw, 1.8rem);
  text-align: center;
}

.testimonials__head .section-title {
  margin-bottom: 0.45rem;
  font-size: clamp(1.7rem, 2.8vw, 2.2rem);
}

.testimonials__head .section-sub {
  max-width: 36rem;
}

.testimonials__preview {
  max-width: 38rem;
  margin: 0 auto 1rem;
  color: var(--text-muted);
  font-size: 0.84rem;
  line-height: 1.45;
  text-align: center;
}

.testimonials__stage {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  grid-template-areas:
    "prev track next"
    ". progress .";
  align-items: center;
  gap: 0.45rem 0.55rem;
  min-width: 0;
}

.testimonials__arrow--prev { grid-area: prev; }
.testimonials__arrow--next { grid-area: next; }
.testimonials__track { grid-area: track; }
.testimonials__progress { grid-area: progress; }

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
.testimonials__track:focus-visible,
.testimonials__dot:focus-visible,
.testimonials__share-toggle:focus-visible,
.testimonials__form input:focus-visible,
.testimonials__form textarea:focus-visible {
  outline: 2px solid var(--focus-ring-color, var(--accent));
  outline-offset: 3px;
}

.testimonials__track {
  --testimonial-gap: 0.85rem;
  --testimonial-peek: 1.15rem;
  --testimonial-columns: 1;
  container-type: inline-size;
  container-name: testimonials;
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: calc(100% - var(--testimonial-gap) - var(--testimonial-peek));
  align-items: stretch;
  gap: var(--testimonial-gap);
  min-width: 0;
  padding-block: 0.35rem 0.55rem;
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
  padding: 1.05rem 1.05rem 0.95rem;
  border: 1px solid color-mix(in srgb, var(--border) 72%, transparent);
  border-radius: 1.15rem;
  background: var(--surface-strong);
  box-shadow: var(--shadow-sm);
  scroll-snap-align: start;
  scroll-snap-stop: normal;
  transition:
    transform 0.45s var(--ease, ease),
    border-color 0.45s var(--ease, ease),
    background-color 0.45s var(--ease, ease),
    box-shadow 0.45s var(--ease, ease);
}

.testimonials__card:hover {
  transform: translateY(-2px);
  border-color: color-mix(in srgb, var(--accent) 36%, var(--border));
}

.testimonials__track.is-dragging .testimonials__card,
.testimonials__track.is-dragging .testimonials__card:hover {
  transform: none;
}

.testimonials__mark {
  display: block;
  width: fit-content;
  margin-bottom: 0.05rem;
  color: color-mix(in srgb, var(--accent) 72%, var(--accent-strong));
  font-size: 1.05rem;
  line-height: 1;
}

.testimonials__quote {
  flex: 1 1 auto;
  margin: 0.35rem 0 0;
  min-width: 0;
}

.testimonials__quote p {
  margin: 0;
  color: var(--text);
  font-family: "Cormorant Garamond", "Source Serif 4", Georgia, serif;
  font-size: clamp(1.05rem, 1.15vw, 1.18rem);
  font-weight: 500;
  letter-spacing: -0.01em;
  line-height: 1.42;
  overflow-wrap: break-word;
}

.testimonials__person {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  margin-top: auto;
  padding-top: 0.85rem;
}

.testimonials__avatar,
.testimonials__photo {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 2rem;
  height: 2rem;
  border: 1px solid color-mix(in srgb, var(--accent) 28%, transparent);
  border-radius: 999px;
  background: var(--accent-light);
  color: var(--accent-strong);
  font-size: 0.72rem;
  font-weight: 700;
  line-height: 1;
  object-fit: cover;
}

.testimonials__identity {
  display: flex;
  flex-direction: column;
  gap: 0.04rem;
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
  font-size: 0.88rem;
  font-weight: 700;
  line-height: 1.25;
}

.testimonials__role {
  color: var(--text-muted);
  font-size: 0.78rem;
  font-weight: 550;
  line-height: 1.3;
}

.testimonials__progress {
  display: flex;
  justify-content: center;
  align-items: center;
  min-width: 0;
}

.testimonials__dot {
  display: grid;
  place-items: center;
  width: 1.75rem;
  height: 1.75rem;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: transparent;
  cursor: pointer;
}

.testimonials__dot::before {
  content: "";
  width: 0.42rem;
  height: 0.42rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--text-muted) 55%, transparent);
}

.testimonials__dot[aria-current="true"]::before {
  width: 1.05rem;
  background: var(--accent);
}

.testimonials__cta {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  max-width: 36rem;
  margin: 1.15rem auto 0;
  text-align: center;
}

.testimonials__cta h3 {
  margin: 0;
  color: var(--text);
  font-family: "Source Serif 4", "Iowan Old Style", Georgia, serif;
  font-size: clamp(1.2rem, 1.8vw, 1.45rem);
  font-weight: 560;
  letter-spacing: -0.02em;
  line-height: 1.25;
}

.testimonials__cta p {
  margin: 0 0 0.35rem;
  color: var(--text-muted);
  font-size: 0.95rem;
  line-height: 1.5;
}

.testimonials__cta .btn {
  gap: 0.4rem;
}

.testimonials__share {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 0.85rem;
}

.testimonials--invite .testimonials__share {
  margin-top: 0;
}

.testimonials__share-lead,
.testimonials__share-status {
  margin: 0;
  text-align: center;
}

.testimonials__share-lead,
.testimonials__share-status {
  max-width: 32rem;
  color: var(--text-muted);
  font-size: 0.88rem;
  line-height: 1.45;
}

.testimonials__share-toggle {
  padding: 0;
  border: 0;
  background: none;
  color: var(--accent-strong);
  font: inherit;
  font-size: 0.88rem;
  text-decoration: underline;
  text-underline-offset: 0.18em;
  cursor: pointer;
}

.testimonials__form {
  display: grid;
  gap: 0.7rem;
  width: min(28rem, 100%);
  margin-top: 0.75rem;
  text-align: start;
}

.testimonials__field {
  display: grid;
  gap: 0.3rem;
  color: var(--text);
  font-size: 0.82rem;
  font-weight: 700;
}

.testimonials__form input,
.testimonials__form textarea {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 0.8rem;
  background: var(--surface);
  color: var(--text);
  font: inherit;
  font-weight: 500;
  font-size: 0.92rem;
  padding: 0.65rem 0.75rem;
}

.testimonials__form textarea {
  min-height: 6.5rem;
  resize: vertical;
}

.testimonials__check {
  display: flex;
  align-items: flex-start;
  gap: 0.55rem;
  color: var(--text-muted);
  font-size: 0.84rem;
  font-weight: 550;
  line-height: 1.4;
}

.testimonials__check input {
  width: auto;
  margin-top: 0.15rem;
}

.testimonials__form-error {
  margin: 0;
  color: var(--danger, var(--accent-strong));
  font-size: 0.84rem;
}

.testimonials__form-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
}

@media (max-width: 767.98px) {
  .wrap {
    padding-block: 2rem 2.2rem;
  }

  .testimonials__stage {
    grid-template-areas:
      "track track track"
      "prev progress next";
  }

  .testimonials__arrow {
    width: 2rem;
    height: 2rem;
  }

  .testimonials__quote p {
    font-size: 1.16rem;
    line-height: 1.4;
  }

  .testimonials__card:last-child {
    scroll-snap-align: end;
  }
}

@media (min-width: 768px) {
  .testimonials__track {
    --testimonial-peek: 0px;
    grid-auto-columns: calc((100% - ((var(--testimonial-columns, 2) - 1) * var(--testimonial-gap))) / var(--testimonial-columns, 2));
  }
}

@media (min-width: 1320px) {
  .testimonials__track {
    --testimonial-peek: 0px;
    grid-auto-columns: calc((100% - ((var(--testimonial-columns, 4) - 1) * var(--testimonial-gap))) / var(--testimonial-columns, 4));
  }
}

@container testimonials (min-width: 640px) {
  .testimonials__track {
    --testimonial-peek: 0px;
    grid-auto-columns: calc((100% - ((var(--testimonial-columns, 2) - 1) * var(--testimonial-gap))) / var(--testimonial-columns, 2));
  }
}

@container testimonials (min-width: 1024px) {
  .testimonials__track {
    --testimonial-peek: 0px;
    grid-auto-columns: calc((100% - ((var(--testimonial-columns, 4) - 1) * var(--testimonial-gap))) / var(--testimonial-columns, 4));
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
  .testimonials__avatar,
  .testimonials__photo {
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
html[dir="rtl"] .testimonials__mark {
  transform: scaleX(-1);
}
</style>
