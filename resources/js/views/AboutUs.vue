<template>
  <main class="info-page about-page">
    <div class="info-shell about-shell">
      <header class="about-hero info-reveal">
        <div class="about-hero__copy">
          <p class="about-hero__kicker">{{ t('aboutUs.kicker') }}</p>
          <h1>{{ t('aboutUs.hero.headline') }}</h1>
          <p class="about-hero__lead">{{ t('aboutUs.heroDesc') }}</p>
          <div class="about-hero__actions">
            <a
              v-if="showExploreCta"
              class="about-btn about-btn--primary"
              href="/memorisation"
            >
              {{ t('aboutUs.ctaExplore') }}
            </a>
            <a class="about-btn about-btn--secondary" href="/waiting-list">
              {{ t('aboutUs.ctaWaitlist') }}
            </a>
          </div>
        </div>
        <figure class="about-hero__media">
          <img
            :src="heroImage.src"
            :srcset="heroImage.srcset"
            sizes="(min-width: 992px) 22rem, 100vw"
            width="960"
            height="640"
            :alt="t('aboutUs.images.heroAlt')"
            decoding="async"
            fetchpriority="high"
            @error="onImageError"
          >
          <figcaption class="visually-hidden">
            {{ t('aboutUs.images.credit', { name: heroImage.photographer }) }}
          </figcaption>
        </figure>
      </header>

      <div class="about-body">
        <section class="about-section info-reveal" style="--d: 50ms" aria-labelledby="about-what-title">
          <h2 id="about-what-title">{{ t('aboutUs.what.title') }}</h2>
          <p>{{ t('aboutUs.what.desc') }}</p>
        </section>

        <div class="about-split info-reveal" style="--d: 80ms">
          <section class="about-section" aria-labelledby="about-how-title">
            <h2 id="about-how-title">{{ t('aboutUs.how.title') }}</h2>
            <ol class="about-steps">
              <li v-for="step in howSteps" :key="step">{{ step }}</li>
            </ol>
          </section>

          <section class="about-section" aria-labelledby="about-tools-title">
            <h2 id="about-tools-title">{{ t('aboutUs.tools.title') }}</h2>
            <ul class="about-list">
              <li v-for="tool in toolItems" :key="tool.key">{{ tool.label }}</li>
            </ul>
          </section>
        </div>

        <section class="about-section about-section--note info-reveal" style="--d: 110ms" aria-labelledby="about-trust-title">
          <h2 id="about-trust-title">{{ t('aboutUs.trust.title') }}</h2>
          <p>{{ t('aboutUs.trust.desc') }}</p>
        </section>
      </div>
    </div>
  </main>
</template>

<script>
const HERO_PEXELS = {
  id: 30890556,
  fallbackId: 36188877,
  photographer: 'Emre Ateşoğlu',
  fallbackPhotographer: 'Jahra Tasfia Reza',
  altFallback: 'Someone reading the Qur’an in a calm, well-lit space',
};

function pexelsSrc(id, width) {
  return `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${width}&fit=crop`;
}

function heroPexelsImage(entry, useFallback = false) {
  const id = useFallback ? entry.fallbackId : entry.id;
  const photographer = useFallback ? entry.fallbackPhotographer : entry.photographer;
  return {
    id,
    src: pexelsSrc(id, 960),
    srcset: `${pexelsSrc(id, 640)} 640w, ${pexelsSrc(id, 960)} 960w, ${pexelsSrc(id, 1200)} 1200w`,
    photographer,
    altFallback: entry.altFallback,
  };
}

export default {
  name: 'AboutUsPage',
  data() {
    return {
      heroImage: heroPexelsImage(HERO_PEXELS),
    };
  },
  computed: {
    showExploreCta() {
      return typeof window === 'undefined' || !window.mutqinRestrictMarketingHost;
    },
    howSteps() {
      return [
        this.t('aboutUs.how.steps.choose'),
        this.t('aboutUs.how.steps.practise'),
        this.t('aboutUs.how.steps.recite'),
        this.t('aboutUs.how.steps.review'),
        this.t('aboutUs.how.steps.return'),
      ];
    },
    toolItems() {
      return [
        { key: 'focus', label: this.t('aboutUs.tools.items.focus') },
        { key: 'linking', label: this.t('aboutUs.tools.items.linking') },
        { key: 'sessions', label: this.t('aboutUs.tools.items.sessions') },
        { key: 'feedback', label: this.t('aboutUs.tools.items.feedback') },
      ];
    },
  },
  methods: {
    onImageError(event) {
      const img = event?.target;
      if (!img || img.dataset.fallbackApplied === '1') {
        img?.classList.add('about-hero__img--failed');
        return;
      }
      img.dataset.fallbackApplied = '1';
      const fallback = heroPexelsImage(HERO_PEXELS, true);
      this.heroImage = fallback;
      img.src = fallback.src;
      img.srcset = fallback.srcset;
    },
  },
};
</script>

<style src="../styles/info-pages.css"></style>
<style src="../styles/about-page.css"></style>
