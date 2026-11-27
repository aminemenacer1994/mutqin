<template>
  <div
    ref="pageRoot"
    class="homepage"
    :class="{ 'homepage--preview': landingPreview }"
    :data-theme="currentTheme"
    :data-inapp="inAppBrowser ? '1' : null"
  >
  <p v-if="landingPreview" class="homepage-preview-banner" role="status">
    <i class="bi bi-eye" aria-hidden="true"></i>
    <span>
      <strong>{{ homepageT('bannerLabel') }}</strong>
      {{ homepageT('bannerDetail') }}
    </span>
  </p>
    <section class="hero" aria-labelledby="homepage-hero-title">
      <div class="hero__glow" aria-hidden="true"></div>
      <div class="hero__inner">
        <div class="hero__grid">
          <div class="hero__copy">
            <h1
              id="homepage-hero-title"
              class="hero__title"
              :data-hero-enter="landingPreview ? '' : null"
              :style="landingPreview ? { '--hero-delay': '0ms' } : undefined"
            >
              {{ homepageT('hero.title') }}
            </h1>
            <ul
              v-if="!landingPreview"
              class="hero__pillars"
              :aria-label="t('homepage.hero.pillarsLabel')"
              :data-hero-enter="landingPreview ? '' : null"
              :style="landingPreview ? { '--hero-delay': '60ms' } : undefined"
            >
              <li v-for="pillar in displayHeroPillars" :key="pillar.id">
                <i class="bi" :class="pillar.icon" aria-hidden="true"></i>
                <span>{{ pillar.label }}</span>
              </li>
            </ul>
            <p
              class="hero__desc hero__desc--desktop"
              :data-hero-enter="landingPreview ? '' : null"
              :style="landingPreview ? { '--hero-delay': '120ms' } : undefined"
            >{{ homepageT('hero.desc') }}</p>
            <p
              class="hero__desc hero__desc--mobile"
              :data-hero-enter="landingPreview ? '' : null"
              :style="landingPreview ? { '--hero-delay': '120ms' } : undefined"
            >{{ homepageT('hero.mobileDesc') }}</p>
            <p
              v-if="!landingPreview"
              class="hero__audience"
              :data-hero-enter="landingPreview ? '' : null"
              :style="landingPreview ? { '--hero-delay': '180ms' } : undefined"
            >
              <i class="bi bi-people" aria-hidden="true"></i>
              <span>{{ homepageT('hero.audience') }}</span>
            </p>

            <div
              class="hero__actions"
              :data-hero-enter="landingPreview ? '' : null"
              :style="landingPreview ? { '--hero-delay': '240ms' } : undefined"
            >
              <a
                v-if="showStartMemorisationCta"
                :href="primaryCta.href"
                class="btn btn--primary"
                data-public-register="1"
                @click="onSeoCta(primaryCta.destination, primaryCta.href, primaryCta.label)"
              >
                <i class="bi bi-play-circle-fill" aria-hidden="true"></i>
                {{ primaryCta.label }}
              </a>
              <a
                v-else
                href="/"
                class="btn btn--primary"
              >
                <i class="bi bi-house-door" aria-hidden="true"></i>
                {{ t('ui.home') }}
              </a>
              <a
                v-if="showStartMemorisationCta"
                :href="heroSecondaryCta.href"
                class="btn btn--secondary"
                @click="onHeroSecondaryClick"
              >
                <i class="bi bi-arrow-right" aria-hidden="true"></i>
                {{ heroSecondaryCta.label }}
              </a>
            </div>

            <div
              v-if="!landingPreview"
              class="hero__availability"
              :class="{ 'hero__availability--early': !showStartMemorisationCta }"
              role="status"
              :data-hero-enter="landingPreview ? '' : null"
              :style="landingPreview ? { '--hero-delay': '300ms' } : undefined"
            >
              <i
                class="bi"
                :class="showStartMemorisationCta ? 'bi-check-circle-fill' : 'bi-hourglass-split'"
                aria-hidden="true"
              ></i>
              <div>
                <strong>{{ homepageT(showStartMemorisationCta ? 'access.available.label' : 'access.early.label') }}</strong>
                <span class="hero__availability-detail">{{ homepageT(showStartMemorisationCta ? 'access.available.detail' : 'access.early.detail') }}</span>
                <span v-if="showStartMemorisationCta" class="hero__availability-compact">{{ homepageT('access.available.mobileDetail') }}</span>
              </div>
            </div>
          </div>

          <div
            class="hero__visual"
            :class="{ 'hero__visual--preview': landingPreview }"
            :data-hero-enter="landingPreview ? '' : null"
            :style="landingPreview ? { '--hero-delay': '200ms' } : undefined"
          >
            <preview-product-stage
              v-if="landingPreview"
              :roles="heroStageRoles"
              :show-tabs="false"
              :show-caption="false"
              :enable-depth="true"
              :autoplay-ms="5200"
              eager
            />
            <div v-else class="hero__fan">
              <figure
                v-for="shot in heroShots"
                :key="shot.id"
                class="hero__fan-item"
                :class="`hero__fan-item--${shot.id}`"
              >
                <div class="device device--sm">
                  <div class="device__island" aria-hidden="true"></div>
                  <div class="device__screen">
                    <img
                      class="shot"
                      :src="shot.src"
                      :alt="shot.alt"
                      width="706"
                      height="1432"
                      sizes="(max-width: 767.98px) 58vw, (max-width: 991.98px) 210px, 230px"
                      :loading="shot.id === 'center' ? 'eager' : 'lazy'"
                      :fetchpriority="shot.id === 'center' ? 'high' : 'low'"
                      decoding="async"
                    >
                  </div>
                </div>
              </figure>
            </div>
          </div>
        </div>
      </div>
    </section>

    <preview-workflow-demo
      v-if="landingPreview && workflowSteps.length"
      :kicker="homepageT('workflow.kicker')"
      :title="homepageT('workflow.title')"
      :subtitle="homepageT('workflow.subtitle')"
      :steps="workflowSteps"
      :play-label="homepageT('workflow.controls.play')"
      :pause-label="homepageT('workflow.controls.pause')"
      :prev-label="homepageT('workflow.controls.prev')"
      :next-label="homepageT('workflow.controls.next')"
      :replay-label="homepageT('workflow.controls.replay')"
      :progress-label="homepageT('workflow.controls.progress')"
    />

    <section
      v-if="landingPreview"
      id="product-explorer"
      class="preview-classroom preview-product-explorer"
      aria-labelledby="preview-product-explorer-title"
    >
      <div class="wrap">
        <header class="section-head" data-reveal>
          <p class="section-kicker">{{ homepageT('classroom.kicker') }}</p>
          <h2 id="preview-product-explorer-title" class="section-title">{{ homepageT('classroom.title') }}</h2>
          <p class="section-sub">{{ homepageT('classroom.subtitle') }}</p>
        </header>
        <preview-product-stage
          :roles="productExplorerRoles"
          :tabs-label="homepageT('classroom.explorerTabsLabel')"
          initial-role="overview"
          :show-caption="false"
          enable-depth
        />
        <p class="preview-product-explorer__cta" data-reveal>
          <a class="preview-text-link" href="/preview/teachers">{{ homepageT('classroom.teacherPageCta') }}</a>
        </p>
        <p class="preview-classroom__caption">{{ homepageT('classroom.authenticCaption') }}</p>
      </div>
    </section>

    <preview-inline-sandbox
      v-if="landingPreview"
      :kicker="homepageT('demo.kicker')"
      :title="homepageT('demo.title')"
      :subtitle="homepageT('demo.subtitle')"
      :seed-hint="homepageT('demo.seedHint')"
      :auto-launch-teacher="false"
    />

    <pricing-page
      v-if="landingPreview"
      embedded
      :landing-preview="true"
    />

    <tutorial-carousel v-if="!landingPreview" />

    <section v-if="!landingPreview" class="practice-types" aria-labelledby="practice-types-title">
      <div class="wrap">
        <header class="section-head" data-reveal>
          <p class="section-kicker">{{ t('homepage.practiceTypes.kicker') }}</p>
          <h2 id="practice-types-title" class="section-title">{{ t('homepage.practiceTypes.title') }}</h2>
          <p class="section-sub">{{ homepageT('practiceTypes.subtitle') }}</p>
        </header>

        <div class="practice-types__grid">
          <article
            v-for="(mode, idx) in practiceModes"
            :key="mode.id"
            class="practice-types__card"
            data-reveal
            :style="{ '--delay': `${idx * 60}ms` }"
          >
            <span class="practice-types__icon" aria-hidden="true"><i class="bi" :class="mode.icon"></i></span>
            <h3>{{ mode.title }}</h3>
            <p>{{ mode.description }}</p>
            <span class="practice-types__cue">{{ mode.cue }}</span>
          </article>
        </div>
      </div>
    </section>

    <section v-if="!landingPreview" id="features" class="features" ref="featuresSection">
      <div class="wrap">
        <header class="section-head" data-reveal>
          <p class="section-kicker">{{ t('homepage.features.kicker') }}</p>
          <h2 class="section-title">{{ t('homepage.features.title') }}</h2>
          <p class="section-sub">{{ t('homepage.features.subtitle') }}</p>
        </header>

        <div v-if="!isFeaturesMobile" class="features__grid">
          <article
            v-for="(feature, idx) in features"
            :key="feature.id"
            class="features__item"
            data-reveal
            :style="{ '--delay': `${idx * 70}ms` }"
          >
            <div class="device device--sm features__device">
              <div class="device__island" aria-hidden="true"></div>
              <div class="device__screen">
                <img
                  class="shot"
                  :src="feature.image"
                  :alt="feature.shotAlt"
                  width="706"
                  height="1432"
                  loading="lazy"
                  decoding="async"
                >
              </div>
            </div>
            <div class="features__copy">
              <span class="features__index" aria-hidden="true">{{ String(idx + 1).padStart(2, '0') }}</span>
              <h3>{{ feature.title }}</h3>
              <p>{{ feature.description }}</p>
            </div>
          </article>
        </div>

        <div
          v-if="isFeaturesMobile"
          id="featuresCarousel"
          ref="featuresCarouselEl"
          class="carousel slide features__carousel"
          data-bs-interval="false"
          data-bs-touch="true"
          data-bs-wrap="true"
          :aria-label="t('homepage.features.carouselLabel')"
        >
          <div class="carousel-inner">
            <div
              v-for="(feature, idx) in features"
              :key="`feature-slide-${feature.id}`"
              class="carousel-item"
              :class="{ active: idx === FEATURES_CAROUSEL_START_INDEX }"
            >
              <div class="features__carousel-media">
                <div class="device device--sm features__device">
                  <div class="device__island" aria-hidden="true"></div>
                  <div class="device__screen">
                    <img
                      class="shot"
                      :src="feature.image"
                      :alt="feature.shotAlt"
                      width="706"
                      height="1432"
                      :loading="idx === FEATURES_CAROUSEL_START_INDEX ? 'eager' : 'lazy'"
                      decoding="async"
                    >
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="carousel-indicators features__carousel-indicators">
            <button
              v-for="(feature, idx) in features"
              :key="`feature-indicator-${feature.id}`"
              type="button"
              data-bs-target="#featuresCarousel"
              :data-bs-slide-to="idx"
              :class="{ active: idx === FEATURES_CAROUSEL_START_INDEX }"
              :aria-label="feature.title"
            ></button>
          </div>
        </div>
        <div v-if="isFeaturesMobile" class="features__copy features__copy--carousel">
          <span class="features__index" aria-hidden="true">{{ String(featuresCarouselIndex + 1).padStart(2, '0') }}</span>
          <h3>{{ activeFeature.title }}</h3>
          <p>{{ activeFeature.description }}</p>
        </div>

      </div>
    </section>

    <testimonials-carousel v-if="showTestimonialsSection" />

    <section id="faq" class="faq">
      <div class="wrap">
        <header class="section-head" data-reveal>
          <p class="section-kicker">{{ homepageT('faq.kicker') }}</p>
          <h2 class="section-title">{{ homepageT('faq.title') }}</h2>
          <p class="section-sub">{{ homepageT('faq.subtitle') }}</p>
        </header>
        <div class="faq__shell" data-reveal>
          <div class="accordion faq__accordion" id="homepageFaq">
            <div class="accordion-item" v-for="(item, idx) in faqItems" :key="item.id">
              <h3 class="accordion-header" :id="`faq-heading-${idx}`">
                <button
                  class="accordion-button"
                  :class="{ collapsed: idx !== 0 }"
                  type="button"
                  data-bs-toggle="collapse"
                  :data-bs-target="`#faq-panel-${idx}`"
                  :aria-expanded="idx === 0 ? 'true' : 'false'"
                  :aria-controls="`faq-panel-${idx}`"
                >
                  {{ item.question }}
                </button>
              </h3>
              <div
                :id="`faq-panel-${idx}`"
                class="accordion-collapse collapse"
                :class="{ show: idx === 0 }"
                :aria-labelledby="`faq-heading-${idx}`"
                data-bs-parent="#homepageFaq"
              >
                <div class="accordion-body">{{ item.answer }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section
      v-if="landingPreview"
      class="preview-closing-cta wrap"
      aria-labelledby="preview-closing-title"
    >
      <h2 id="preview-closing-title" class="section-title" data-reveal>{{ homepageT('closing.title') }}</h2>
      <div class="hero__actions" data-reveal>
        <a class="btn btn--primary" :href="primaryCta.href" data-public-register="1">{{ homepageT('closing.primary') }}</a>
        <a class="btn btn--secondary" href="#sandbox" @click.prevent="scrollToId('sandbox')">{{ homepageT('closing.secondary') }}</a>
      </div>
    </section>

    <section v-if="!landingPreview" id="contact" class="contact">
      <div class="wrap wrap--narrow">
        <div class="contact__card" data-reveal>
          <header class="contact__head">
            <p class="section-kicker section-kicker--left">{{ t('homepage.contact.kicker') }}</p>
            <h2 class="contact__title">{{ t('homepage.contact.title') }}</h2>
            <p class="contact__sub">{{ t('homepage.contact.extendedSubtitle') }}</p>
          </header>

          <div
            v-if="contactStatus.message"
            class="contact__alert"
            :class="contactStatus.type === 'success' ? 'contact__alert--ok' : 'contact__alert--err'"
            role="alert"
          >
            {{ contactStatus.message }}
          </div>

          <form class="contact__form" @submit.prevent="submitContact">
            <div class="contact__grid">
              <div class="contact__field">
                <label class="form-label" for="contactName">{{ t('homepage.name') }}</label>
                <input id="contactName" v-model.trim="contactForm.name" type="text" inputmode="text" class="form-control" :class="{ 'is-invalid': contactErrors.name }" autocomplete="name" :placeholder="t('homepage.contact.placeholders.name')" :aria-invalid="contactErrors.name ? 'true' : 'false'" :aria-describedby="contactErrors.name ? 'contactNameError' : undefined">
                <div v-if="contactErrors.name" id="contactNameError" class="invalid-feedback d-block" role="alert">{{ contactErrors.name }}</div>
              </div>
              <div class="contact__field">
                <label class="form-label" for="contactEmail">{{ t('homepage.contact.email') }}</label>
                <input id="contactEmail" v-model.trim="contactForm.email" type="email" inputmode="email" class="form-control" :class="{ 'is-invalid': contactErrors.email }" autocomplete="email" :placeholder="t('homepage.contact.placeholders.email')" :aria-invalid="contactErrors.email ? 'true' : 'false'" :aria-describedby="contactErrors.email ? 'contactEmailError' : undefined">
                <div v-if="contactErrors.email" id="contactEmailError" class="invalid-feedback d-block" role="alert">{{ contactErrors.email }}</div>
              </div>
            </div>
            <div class="contact__field">
              <label class="form-label" for="contactSubject">{{ t('homepage.contact.subject') }}</label>
              <input id="contactSubject" v-model.trim="contactForm.subject" type="text" inputmode="text" class="form-control" :class="{ 'is-invalid': contactErrors.subject }" autocomplete="off" :placeholder="t('homepage.contact.placeholders.subject')" required :aria-invalid="contactErrors.subject ? 'true' : 'false'" :aria-describedby="contactErrors.subject ? 'contactSubjectError' : undefined">
              <div v-if="contactErrors.subject" id="contactSubjectError" class="invalid-feedback d-block" role="alert">{{ contactErrors.subject }}</div>
            </div>
            <div class="contact__field">
              <label class="form-label" for="contactMessage">{{ t('homepage.contact.message') }}</label>
              <textarea id="contactMessage" v-model.trim="contactForm.message" class="form-control contact__message" :class="{ 'is-invalid': contactErrors.message }" rows="3" inputmode="text" autocomplete="off" :placeholder="t('homepage.contact.placeholders.message')" :aria-invalid="contactErrors.message ? 'true' : 'false'" :aria-describedby="contactErrors.message ? 'contactMessageError' : undefined"></textarea>
              <div v-if="contactErrors.message" id="contactMessageError" class="invalid-feedback d-block" role="alert">{{ contactErrors.message }}</div>
            </div>
            <button type="submit" class="btn btn--primary contact__submit" :disabled="contactSubmitting">
              <i class="bi" :class="contactSubmitting ? 'bi-arrow-repeat contact__spin' : 'bi-send'" aria-hidden="true"></i>
              {{ contactSubmitting ? t('homepage.contact.sending') : t('homepage.contact.sendMessage') }}
            </button>
          </form>
        </div>
      </div>
    </section>

    <footer class="footer">
      <div class="footer__inner">
        <div class="footer__grid">
          <div class="footer__brand">
            <div class="footer__logo">
              <i class="bi bi-moon-stars" aria-hidden="true"></i>
              <h3>Mutqin</h3>
            </div>
            <p>{{ homepageT('focused_quran_memorisation_tools_for_recitation_ch') }}</p>
          </div>
          <div class="footer__links">
            <h4>{{ t('homepage.footer.product') }}</h4>
            <template v-if="landingPreview">
              <a href="/preview/teachers">{{ homepageT('ecosystem.roles.teacher.title') }}</a>
              <a href="/preview/students">{{ homepageT('ecosystem.roles.student.title') }}</a>
              <a href="/preview/parents">{{ homepageT('ecosystem.roles.parent.title') }}</a>
              <a href="/preview/learning">{{ homepageT('ecosystem.roles.personal.title') }}</a>
              <a href="/preview/pricing">{{ t('homepage.footer.pricing') }}</a>
              <a href="/preview/demo">{{ t('homepage.footer.demo') }}</a>
            </template>
            <template v-else>
              <a href="/features">{{ t('homepage.footer.howItWorks') }}</a>
              <a href="#features" @click.prevent="scrollToFeatures">{{ t('homepage.footer.features') }}</a>
              <a href="#faq" @click.prevent="scrollToId('faq')">{{ t('homepage.footer.faq') }}</a>
            </template>
          </div>
          <div class="footer__links">
            <h4>{{ t('homepage.footer.resources') }}</h4>
            <a v-if="showArticles" href="/articles">{{ t('homepage.footer.articles') }}</a>
            <a href="/about">{{ t('homepage.footer.explanation') }}</a>
          </div>
          <div class="footer__links">
            <h4>{{ t('homepage.footer.company') }}</h4>
            <a href="#contact" @click.prevent="scrollToId('contact')">{{ t('homepage.footer.contact') }}</a>
            <a href="/about">{{ t('homepage.footer.aboutUs') }}</a>
            <a v-if="showDonate" href="/donate">{{ t('homepage.footer.donate') }}</a>
            <a href="/privacy">{{ t('homepage.footer.privacy') }}</a>
          </div>
        </div>
        <div class="footer__bottom">
          <p class="footer__tagline">{{ homepageT('footer.tagline') }}</p>
          <span class="footer__copy">{{ t('homepage.all_rights_reserved') }}</span>
          <nav class="footer__social" :aria-label="t('homepage.footer.connect')">
            <a
              v-for="link in socialLinks"
              :key="link.id"
              class="footer__social-link"
              :href="link.href"
              target="_blank"
              rel="noopener noreferrer"
              :aria-label="t(`homepage.footer.social.${link.id}`)"
            >
              <i class="bi" :class="link.icon" aria-hidden="true"></i>
            </a>
          </nav>
        </div>
      </div>
    </footer>
  </div>
</template>

<script>
import { reactive, ref, computed, nextTick, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import TutorialCarousel from '../components/TutorialCarousel.vue';
import TestimonialsCarousel from '../components/TestimonialsCarousel.vue';
import PreviewProductStage from '../components/preview/PreviewProductStage.vue';
import PreviewWorkflowDemo from '../components/preview/PreviewWorkflowDemo.vue';
import PreviewInlineSandbox from '../components/preview/PreviewInlineSandbox.vue';
import PricingPage from './PricingPage.vue';
import {
  bindRevealObserver,
  mountHeroEntrance,
  mountPreviewPageEnter,
} from '../composables/usePreviewMotion.js';
import { previewTeacherAssetUrl } from '../config/previewTeacherShots.js';
import { TESTIMONIALS_SECTION_ENABLED } from '../config/testimonials.js';
import { getSavedTheme, setGlobalTheme } from '../utils/theme';
import { trackSeoCtaClick, trackSeoLandingView } from '../scripts/seoTools/track.js';
import { META_PIXEL_EVENTS, trackMetaPixelEvent } from '../scripts/analytics/metaPixel.js';
import { isInAppBrowser, publicRegisterHref } from '../scripts/analytics/registerLinks.js';

export default {
  name: 'Homepage',
  components: {
    TutorialCarousel,
    TestimonialsCarousel,
    PreviewProductStage,
    PreviewWorkflowDemo,
    PreviewInlineSandbox,
    PricingPage,
  },
  props: {
    landingPreview: {
      type: Boolean,
      default: false,
    },
  },
  setup(props) {
    const { t, te, locale } = useI18n();
    const landingPreview = computed(() => {
      if (props.landingPreview) {
        return true;
      }

      return typeof window !== 'undefined' && window.mutqinLandingPreview === true;
    });
    const homepageT = (key) => {
      if (landingPreview.value) {
        const previewKey = `homepage.preview.${key}`;
        if (te(previewKey)) {
          return t(previewKey);
        }
      }

      return t(`homepage.${key}`);
    };
    const showTestimonialsSection = TESTIMONIALS_SECTION_ENABLED;
    const showStartMemorisationCta = typeof window === 'undefined' || !window.mutqinRestrictMarketingHost;
    const showArticles = typeof window !== 'undefined' && window.mutqinShowArticles === true;
    const showDonate = typeof window !== 'undefined' && window.mutqinShowDonate === true;
    const inAppBrowser = typeof window !== 'undefined' && isInAppBrowser();
    const primaryCta = computed(() => {
      const isAuthenticated = typeof window !== 'undefined' && Boolean(window.mutqinAuthCheck);

      if (landingPreview.value) {
        return {
          destination: 'registration',
          href: publicRegisterHref({ intent: 'first' }),
          label: homepageT('hero.startFree'),
        };
      }

      return isAuthenticated
        ? {
          destination: 'memorisation',
          href: '/memorisation?journey=daily',
          label: homepageT('hero.startFirstSession'),
        }
        : {
          destination: 'registration',
          href: publicRegisterHref({ intent: 'first' }),
          label: homepageT('hero.startFree'),
        };
    });

    const heroSecondaryCta = computed(() => {
      if (landingPreview.value) {
        return {
          href: '#sandbox',
          label: homepageT('hero.seeFirstSession'),
        };
      }

      return {
        href: '/features',
        label: homepageT('hero.seeFirstSession'),
      };
    });

    const onHeroSecondaryClick = (event) => {
      const href = heroSecondaryCta.value.href;
      if (href?.startsWith('#')) {
        event.preventDefault();
        scrollToId(href.slice(1));
      }
    };
    const currentTheme = ref(getSavedTheme());
    const FEATURES_CAROUSEL_START_INDEX = 2;
    const FEATURES_MOBILE_MQ = '(max-width: 767.98px)';
    const featuresSection = ref(null);
    const featuresCarouselEl = ref(null);
    const isFeaturesMobile = ref(
      typeof window !== 'undefined' ? window.matchMedia(FEATURES_MOBILE_MQ).matches : false,
    );
    const featuresCarouselIndex = ref(FEATURES_CAROUSEL_START_INDEX);
    let featuresCarousel = null;
    let featuresMobileMq = null;
    let featuresCarouselSlideHandler = null;
    const demoPlaying = ref(false);
    const demoActiveIndex = ref(0);
    const demoProgress = ref(0);
    const DEMO_STEP_MS = 3800;
    let demoTimer = null;

    const demoSteps = computed(() => {
      void locale.value;
      return [
        {
          id: 'setup',
          image: '/images/landing/2026-11-session-setup.jpg',
          label: t('homepage.pipelineDemo.steps.setup.label'),
          text: t('homepage.pipelineDemo.steps.setup.text'),
        },
        {
          id: 'practise',
          image: '/images/landing/2026-11-session-practice.jpg',
          label: t('homepage.pipelineDemo.steps.practise.label'),
          text: t('homepage.pipelineDemo.steps.practise.text'),
        },
        {
          id: 'check',
          image: '/images/landing/2026-11-recite-active.jpg',
          label: t('homepage.pipelineDemo.steps.check.label'),
          text: t('homepage.pipelineDemo.steps.check.text'),
        },
      ];
    });

    const syncDemoProgress = () => {
      const total = demoSteps.value.length || 1;
      demoProgress.value = ((demoActiveIndex.value + 1) / total) * 100;
    };
    syncDemoProgress();

    const clearDemoTimer = () => {
      if (demoTimer) {
        window.clearInterval(demoTimer);
        demoTimer = null;
      }
    };

    const tickDemo = () => {
      demoActiveIndex.value = (demoActiveIndex.value + 1) % demoSteps.value.length;
      syncDemoProgress();
    };

    const startDemoPlayback = () => {
      clearDemoTimer();
      demoPlaying.value = true;
      syncDemoProgress();
      demoTimer = window.setInterval(tickDemo, DEMO_STEP_MS);
    };

    const stopDemoPlayback = () => {
      clearDemoTimer();
      demoPlaying.value = false;
    };

    const toggleDemoPlayback = () => {
      if (demoPlaying.value) stopDemoPlayback();
      else startDemoPlayback();
    };

    const seekDemoStep = (idx) => {
      demoActiveIndex.value = idx;
      syncDemoProgress();
      if (demoPlaying.value) {
        clearDemoTimer();
        demoTimer = window.setInterval(tickDemo, DEMO_STEP_MS);
      }
    };

    let disconnectReveals = () => {};
    let cleanupPageEnter = () => {};
    let cleanupHero = () => {};

    const syncFeaturesMobile = () => {
      isFeaturesMobile.value = featuresMobileMq?.matches ?? false;
    };

    const onFeaturesCarouselSlide = (event) => {
      if (typeof event?.to === 'number') {
        featuresCarouselIndex.value = event.to;
      }
    };

    const initFeaturesCarousel = async () => {
      if (!isFeaturesMobile.value) return;
      await nextTick();
      const el = featuresCarouselEl.value;
      if (!el || !window.bootstrap?.Carousel) return;
      disposeFeaturesCarousel();
      featuresCarouselSlideHandler = onFeaturesCarouselSlide;
      el.addEventListener('slid.bs.carousel', featuresCarouselSlideHandler);
      featuresCarousel = window.bootstrap.Carousel.getOrCreateInstance(el, {
        interval: false,
        touch: true,
        wrap: true,
      });
      featuresCarouselIndex.value = FEATURES_CAROUSEL_START_INDEX;
      featuresCarousel.to(FEATURES_CAROUSEL_START_INDEX);
    };

    const disposeFeaturesCarousel = () => {
      const el = featuresCarouselEl.value;
      if (el && featuresCarouselSlideHandler) {
        el.removeEventListener('slid.bs.carousel', featuresCarouselSlideHandler);
      }
      featuresCarouselSlideHandler = null;
      featuresCarousel?.dispose?.();
      featuresCarousel = null;
    };

    const onFeaturesMobileChange = () => {
      syncFeaturesMobile();
      if (isFeaturesMobile.value) initFeaturesCarousel();
      else disposeFeaturesCarousel();
    };

    const applyTheme = () => {
      currentTheme.value = getSavedTheme();
      setGlobalTheme(currentTheme.value, { dispatchEvent: false, persist: false });
    };

    const onThemeChange = (event) => {
      currentTheme.value = event?.detail?.theme || getSavedTheme();
    };

    const scrollToFeatures = () => {
      featuresSection.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const scrollToId = (id) => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const socialLinks = [
      { id: 'instagram', href: 'https://www.instagram.com/mutqinai/', icon: 'bi-instagram' },
      { id: 'facebook', href: 'https://www.facebook.com/profile.php?id=61594103506759', icon: 'bi-facebook' },
      { id: 'linkedin', href: 'https://www.linkedin.com/company/146569969/', icon: 'bi-linkedin' },
      { id: 'youtube', href: 'https://www.youtube.com/@Mutqin-w7h', icon: 'bi-youtube' },
    ];

    const contactForm = reactive({ name: '', email: '', subject: '', message: '' });
    const contactErrors = reactive({});
    const contactStatus = reactive({ type: '', message: '' });
    const contactSubmitting = ref(false);

    const clearContactFeedback = () => {
      Object.keys(contactErrors).forEach((key) => delete contactErrors[key]);
      contactStatus.type = '';
      contactStatus.message = '';
    };

    const validateContact = () => {
      clearContactFeedback();
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!contactForm.name) contactErrors.name = t('homepage.contact.errors.name');
      if (!contactForm.email) contactErrors.email = t('homepage.contact.errors.email');
      else if (!emailPattern.test(contactForm.email)) contactErrors.email = t('homepage.contact.errors.emailInvalid');
      if (!contactForm.subject) contactErrors.subject = t('homepage.contact.errors.subject');
      if (!contactForm.message) contactErrors.message = t('homepage.contact.errors.message');
      return Object.keys(contactErrors).length === 0;
    };

    const submitContact = async () => {
      if (!validateContact()) return;
      contactSubmitting.value = true;
      try {
        await window.axios.post('/api/contact', {
          name: contactForm.name,
          email: contactForm.email,
          subject: contactForm.subject,
          message: contactForm.message,
        });
        contactStatus.type = 'success';
        contactStatus.message = t('homepage.contact.success');
        contactForm.name = '';
        contactForm.email = '';
        contactForm.subject = '';
        contactForm.message = '';
      } catch (error) {
        const validationErrors = error?.response?.data?.errors || {};
        Object.entries(validationErrors).forEach(([field, messages]) => {
          contactErrors[field] = Array.isArray(messages) ? messages[0] : messages;
        });
        contactStatus.type = 'error';
        contactStatus.message = Object.keys(validationErrors).length
          ? t('homepage.contact.errorFields')
          : t('homepage.contact.errorSend');
      } finally {
        contactSubmitting.value = false;
      }
    };

    const heroShots = computed(() => {
      void locale.value;
      return [
        { id: 'left', src: '/images/landing/2026-11-recite-active.jpg', alt: t('homepage.shots.check') },
        { id: 'center', src: '/images/landing/2026-11-hero-mushaf.jpg', alt: t('homepage.features.items.translationTajweed.description') },
        { id: 'right', src: '/images/landing/2026-11-hero-dashboard.jpg', alt: t('homepage.shots.return') },
      ];
    });

    const previewAssetUrl = previewTeacherAssetUrl;
    const pageRoot = ref(null);

    const heroStageRoles = computed(() => {
      void locale.value;
      if (!landingPreview.value) {
        return [];
      }

      const heroShots = [
        { id: 'priorities', asset: 'overview-priorities', altKey: 'heroShowcase.roles.teacher.alt' },
        { id: 'overview', asset: 'overview', altKey: 'classroom.explorer.overview.alt' },
        { id: 'students', asset: 'students', altKey: 'classroom.explorer.students.alt' },
        { id: 'assign', asset: 'assignment-create', altKey: 'classroom.explorer.assignments.alt' },
        { id: 'detail', asset: 'assignment-detail', altKey: 'workflow.steps.assign.alt' },
        { id: 'reviews', asset: 'reviews', altKey: 'classroom.explorer.reviews.alt' },
      ];

      return heroShots.map((shot) => ({
        id: shot.id,
        label: '',
        caption: '',
        src: previewAssetUrl(shot.asset),
        alt: homepageT(shot.altKey),
      }));
    });

    const workflowStepImage = (id) => {
      const assets = {
        assign: 'assignment-create',
        receive: 'assignments',
        review: 'review-detail',
        feedback: 'messages',
      };

      return previewAssetUrl(assets[id] || 'overview-priorities');
    };

    const workflowSteps = computed(() => {
      void locale.value;
      if (!landingPreview.value) {
        return [];
      }

      const ids = ['assign', 'receive', 'review', 'feedback'];
      return ids.map((id) => ({
        id,
        title: homepageT(`workflow.steps.${id}.title`),
        shortLabel: homepageT(`workflow.steps.${id}.shortLabel`),
        caption: homepageT(`workflow.steps.${id}.caption`),
        body: homepageT(`workflow.steps.${id}.body`),
        platform: homepageT(`workflow.steps.${id}.platform`),
        src: workflowStepImage(id),
        alt: homepageT(`workflow.steps.${id}.alt`),
      }));
    });

    const heroPillars = computed(() => {
      void locale.value;
      return [
        { id: 'memorise', icon: 'bi-journal-plus', label: t('homepage.practiceTypes.items.memorise.title') },
        { id: 'revise', icon: 'bi-arrow-repeat', label: t('homepage.practiceTypes.items.revise.title') },
        { id: 'ai-recite', icon: 'bi-mic-fill', label: t('homepage.practiceTypes.items.aiRecite.title') },
      ];
    });

    const displayHeroPillars = computed(() => {
      void locale.value;
      if (!landingPreview.value) {
        return heroPillars.value;
      }

      return [
        { id: 'class', icon: 'bi-people', label: homepageT('hero.pillars.class') },
        { id: 'memorise', icon: 'bi-journal-plus', label: homepageT('hero.pillars.memorise') },
        { id: 'parents', icon: 'bi-shield-check', label: homepageT('hero.pillars.parents') },
        { id: 'personal', icon: 'bi-mic-fill', label: homepageT('hero.pillars.personal') },
      ];
    });

    const ecosystemRoles = computed(() => {
      void locale.value;
      if (!landingPreview.value) {
        return [];
      }

      return [
        { id: 'teacher', title: homepageT('ecosystem.roles.teacher.title'), body: homepageT('ecosystem.roles.teacher.body'), href: '/preview/teachers' },
        { id: 'student', title: homepageT('ecosystem.roles.student.title'), body: homepageT('ecosystem.roles.student.body'), href: '/preview/students' },
        { id: 'parent', title: homepageT('ecosystem.roles.parent.title'), body: homepageT('ecosystem.roles.parent.body'), href: '/preview/parents' },
        { id: 'personal', title: homepageT('ecosystem.roles.personal.title'), body: homepageT('ecosystem.roles.personal.body'), href: '/preview/learning' },
        { id: 'institution', title: homepageT('ecosystem.roles.institution.title'), body: homepageT('ecosystem.roles.institution.body'), href: '/preview/institutions' },
      ];
    });

    const productExplorerRoles = computed(() => {
      void locale.value;
      if (!landingPreview.value) {
        return [];
      }

      const items = [
        { id: 'overview', asset: 'overview' },
        { id: 'students', asset: 'students' },
        { id: 'assignments', asset: 'assignments' },
        { id: 'reviews', asset: 'reviews' },
        { id: 'plans', asset: 'learning-plan' },
      ];

      return items.map((item) => ({
        id: item.id,
        label: homepageT(`classroom.explorer.${item.id}.label`),
        caption: homepageT(`classroom.explorer.${item.id}.caption`),
        src: previewAssetUrl(item.asset),
        alt: homepageT(`classroom.explorer.${item.id}.alt`),
      }));
    });

    const practiceModes = computed(() => {
      void locale.value;
      return [
        {
          id: 'memorise',
          icon: 'bi-journal-plus',
          title: t('homepage.practiceTypes.items.memorise.title'),
          description: t('homepage.practiceTypes.items.memorise.description'),
          cue: t('homepage.practiceTypes.items.memorise.cue'),
        },
        {
          id: 'revise',
          icon: 'bi-arrow-repeat',
          title: t('homepage.practiceTypes.items.revise.title'),
          description: t('homepage.practiceTypes.items.revise.description'),
          cue: t('homepage.practiceTypes.items.revise.cue'),
        },
        {
          id: 'ai-recite',
          icon: 'bi-mic-fill',
          title: t('homepage.practiceTypes.items.aiRecite.title'),
          description: t('homepage.practiceTypes.items.aiRecite.description'),
          cue: t('homepage.practiceTypes.items.aiRecite.cue'),
        },
      ];
    });

    const features = computed(() => {
      void locale.value;
      return [
        {
          id: 'setup',
          image: '/images/landing/2026-11-session-setup.jpg',
          title: t('homepage.features.items.setup.title'),
          description: t('homepage.features.items.setup.description'),
          shotAlt: t('homepage.shots.setup'),
        },
        {
          id: 'techniques',
          image: '/images/landing/2026-11-practice-tools.jpg',
          title: t('homepage.features.items.techniques.title'),
          description: t('homepage.features.items.techniques.description'),
          shotAlt: t('homepage.shots.tools'),
        },
        {
          id: 'progress',
          image: '/images/landing/2026-11-review-list.jpg',
          title: t('homepage.features.items.progress.title'),
          description: t('homepage.features.items.progress.description'),
          shotAlt: t('homepage.features.items.progress.description'),
        },
        {
          id: 'aiRecitation',
          image: '/images/landing/2026-11-recite-feedback.jpg',
          title: t('homepage.features.items.aiRecitation.title'),
          description: t('homepage.features.items.aiRecitation.description'),
          shotAlt: t('homepage.features.items.aiRecitation.description'),
        },
        {
          id: 'mushafLayout',
          image: '/images/landing/2026-11-focused-mushaf.jpg',
          title: t('homepage.features.items.mushafLayout.title'),
          description: t('homepage.features.items.mushafLayout.description'),
          shotAlt: t('homepage.features.items.mushafLayout.description'),
        },
        {
          id: 'translationTajweed',
          image: '/images/landing/2026-11-reading-aids.jpg',
          title: t('homepage.features.items.translationTajweed.title'),
          description: t('homepage.features.items.translationTajweed.description'),
          shotAlt: t('homepage.features.items.translationTajweed.description'),
        },
      ];
    });

    const activeFeature = computed(() => (
      features.value[featuresCarouselIndex.value] ?? features.value[FEATURES_CAROUSEL_START_INDEX] ?? features.value[0]
    ));

    const faqItems = computed(() => {
      void locale.value;
      if (landingPreview.value) {
        const previewIds = [
          'withoutTeacher',
          'freeAccess',
          'aiCheck',
          'oneAccount',
          'parentProgress',
          'tryDemo',
        ];
        return previewIds.map((id) => ({
          id,
          question: homepageT(`faq.items.${id}.question`),
          answer: homepageT(`faq.items.${id}.answer`),
        }));
      }

      return [
        { id: 'whatIsMutqin', question: homepageT('faq.items.whatIsMutqin.question'), answer: homepageT('faq.items.whatIsMutqin.answer') },
        { id: 'howMemorisation', question: homepageT('faq.items.howMemorisation.question'), answer: homepageT('faq.items.howMemorisation.answer') },
        { id: 'howRevision', question: homepageT('faq.items.howRevision.question'), answer: homepageT('faq.items.howRevision.answer') },
        { id: 'freeAccess', question: homepageT('faq.items.freeAccess.question'), answer: homepageT('faq.items.freeAccess.answer') },
        { id: 'whoFor', question: homepageT('faq.items.whoFor.question'), answer: homepageT('faq.items.whoFor.answer') },
      ];
    });

    const onSeoCta = (dest, href, label) => {
      trackMetaPixelEvent(META_PIXEL_EVENTS.PRIMARY_CTA_CLICKED, { destination: dest });
      trackSeoCtaClick({
        dest,
        href,
        label,
        ctaId: `home_${dest}`,
      });
    };

    onMounted(() => {
      trackSeoLandingView({
        kind: landingPreview.value ? 'preview_home' : 'home',
        pageId: landingPreview.value ? 'preview_home' : 'home',
        path: landingPreview.value ? '/preview' : '/',
      });
      applyTheme();
      window.addEventListener('mutqin:theme-change', onThemeChange);

      const root = pageRoot.value || document;
      if (landingPreview.value) {
        cleanupPageEnter = mountPreviewPageEnter(pageRoot.value);
        cleanupHero = mountHeroEntrance(pageRoot.value?.querySelector('.hero'));
      }

      disconnectReveals = bindRevealObserver({
        root,
        selector: '[data-reveal]',
      });

      featuresMobileMq = window.matchMedia(FEATURES_MOBILE_MQ);
      syncFeaturesMobile();
      featuresMobileMq.addEventListener('change', onFeaturesMobileChange);
      initFeaturesCarousel();

    });

    onUnmounted(() => {
      window.removeEventListener('mutqin:theme-change', onThemeChange);
      disconnectReveals();
      cleanupPageEnter();
      cleanupHero();
      featuresMobileMq?.removeEventListener('change', onFeaturesMobileChange);
      disposeFeaturesCarousel();
      clearDemoTimer();
    });

    return {
      t,
      landingPreview,
      homepageT,
      showTestimonialsSection,
      showStartMemorisationCta,
      showArticles,
      showDonate,
      primaryCta,
      inAppBrowser,
      currentTheme,
      heroPillars,
      displayHeroPillars,
      previewAssetUrl,
      pageRoot,
      heroStageRoles,
      workflowSteps,
      ecosystemRoles,
      productExplorerRoles,
      heroSecondaryCta,
      onHeroSecondaryClick,
      socialLinks,
      FEATURES_CAROUSEL_START_INDEX,
      isFeaturesMobile,
      featuresCarouselIndex,
      activeFeature,
      featuresSection,
      featuresCarouselEl,
      scrollToFeatures,
      scrollToId,
      heroShots,
      practiceModes,
      features,
      faqItems,
      demoPlaying,
      demoActiveIndex,
      demoProgress,
      demoSteps,
      toggleDemoPlayback,
      seekDemoStep,
      contactForm,
      contactErrors,
      contactStatus,
      contactSubmitting,
      submitContact,
      onSeoCta,
    };
  },
};
</script>

<style src="./Homepage.css"></style>
<style src="../styles/preview-motion.css"></style>
<style src="../styles/preview-editorial-tokens.css"></style>
<style src="../styles/preview-landing-polish.css"></style>
