<template>
  <div class="homepage" :data-theme="currentTheme">
    <section class="hero" aria-labelledby="homepage-hero-title">
      <div class="hero__glow" aria-hidden="true"></div>
      <div class="hero__inner">
        <div class="hero__grid">
          <div class="hero__copy" data-reveal="left">
            <p class="hero__brand">
              <i class="bi bi-moon-stars-fill" aria-hidden="true"></i>
              Mutqin
            </p>
            <h1 id="homepage-hero-title" class="hero__title">
              {{ t('homepage.hero.title') }}
            </h1>
            <p class="hero__desc">{{ t('homepage.hero.desc') }}</p>

            <div class="hero__promise" role="group" :aria-label="t('homepage.hero.promiseLabel')">
              <p>
                <span class="hero__promise-label">{{ t('homepage.hero.problem') }}</span>
                {{ t('homepage.hero.problemText') }}
              </p>
              <p>
                <span class="hero__promise-label">{{ t('homepage.hero.solution') }}</span>
                {{ t('homepage.hero.solutionText') }}
              </p>
            </div>

            <div class="hero__actions">
              <a :href="startFreeHref" class="btn btn--primary">
                <i class="bi bi-play-fill" aria-hidden="true"></i>
                {{ t('homepage.hero.startFree') }}
              </a>
              <a href="/waiting-list" class="btn btn--secondary">
                <i class="bi bi-envelope-open" aria-hidden="true"></i>
                {{ t('homepage.hero.joinWaitlist') }}
              </a>
            </div>
          </div>

          <div class="hero__visual" data-reveal="right">
            <div class="hero__fan">
              <figure
                v-for="shot in heroShots"
                :key="shot.id"
                class="hero__fan-item"
                :class="`hero__fan-item--${shot.id}`"
              >
                <img
                  class="shot"
                  :src="shot.src"
                  :alt="shot.alt"
                  width="444"
                  height="929"
                  :loading="shot.id === 'center' ? 'eager' : 'lazy'"
                  decoding="async"
                >
              </figure>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section id="how-it-works" class="how">
      <div class="wrap">
        <header class="section-head" data-reveal>
          <p class="section-kicker">{{ t('homepage.how.kicker') }}</p>
          <h2 class="section-title">{{ t('homepage.how.title') }}</h2>
          <p class="section-sub">{{ t('homepage.how.subtitle') }}</p>
        </header>

        <div class="how__flow">
          <article
            v-for="(item, idx) in howItems"
            :key="item.id"
            class="how__row"
            :class="{ 'how__row--flip': idx % 2 === 1 }"
            data-reveal
          >
            <div class="how__copy">
              <span class="how__index">{{ String(idx + 1).padStart(2, '0') }}</span>
              <h3>{{ item.title }}</h3>
              <p class="how__lead">{{ item.description }}</p>
              <p v-if="item.detail" class="how__detail">{{ item.detail }}</p>
            </div>
            <div class="how__shot">
              <img
                class="shot"
                :src="item.image"
                :alt="item.shotAlt"
                width="444"
                height="929"
                loading="lazy"
                decoding="async"
              >
            </div>
          </article>
        </div>
      </div>
    </section>

    <section id="demo" class="demo" aria-labelledby="demo-title">
      <div class="wrap">
        <header class="section-head" data-reveal>
          <p class="section-kicker">{{ t('homepage.pipelineDemo.kicker') }}</p>
          <h2 id="demo-title" class="section-title">{{ t('homepage.pipelineDemo.title') }}</h2>
          <p class="section-sub">{{ t('homepage.pipelineDemo.subtitle') }}</p>
        </header>

        <div class="demo__stage" data-reveal>
          <div class="demo__glow" aria-hidden="true"></div>
          <div class="demo__player">
            <video
              ref="demoVideo"
              class="demo__video"
              playsinline
              muted
              loop
              preload="auto"
              :poster="demoPoster"
              @timeupdate="onDemoTimeUpdate"
              @play="demoPlaying = true"
              @pause="demoPlaying = false"
            >
              <source src="/videos/product-pipeline-demo.webm" type="video/webm">
              <source src="/videos/product-pipeline-demo.mp4" type="video/mp4">
            </video>
            <button
              type="button"
              class="demo__toggle"
              :aria-label="demoPlaying ? t('homepage.pipelineDemo.pause') : t('homepage.pipelineDemo.play')"
              @click="toggleDemoPlayback"
            >
              <i class="bi" :class="demoPlaying ? 'bi-pause-fill' : 'bi-play-fill'" aria-hidden="true"></i>
            </button>
          </div>

          <ol class="demo__steps" :aria-label="t('homepage.pipelineDemo.pipelineLabel')">
            <li
              v-for="(step, idx) in demoSteps"
              :key="step.id"
              class="demo__step"
              :class="{ 'is-active': idx === demoActiveIndex, 'is-done': idx < demoActiveIndex }"
            >
              <button type="button" class="demo__step-btn" @click="seekDemoStep(idx)">
                <span class="demo__step-num" aria-hidden="true">{{ idx + 1 }}</span>
                <span class="demo__step-copy">
                  <strong>{{ step.label }}</strong>
                  <span>{{ step.text }}</span>
                </span>
              </button>
            </li>
          </ol>
        </div>
      </div>
    </section>

    <section id="features" class="features" ref="featuresSection">
      <div class="wrap">
        <header class="section-head" data-reveal>
          <p class="section-kicker">{{ t('homepage.features.kicker') }}</p>
          <h2 class="section-title">{{ t('homepage.features.title') }}</h2>
          <p class="section-sub">{{ t('homepage.features.subtitle') }}</p>
        </header>

        <div class="features__grid">
          <article
            v-for="(feature, idx) in features"
            :key="feature.id"
            class="features__item"
            data-reveal
            :style="{ '--delay': `${idx * 70}ms` }"
          >
            <img
              class="shot features__shot"
              :src="feature.image"
              :alt="feature.shotAlt"
              width="444"
              height="929"
              loading="lazy"
              decoding="async"
            >
            <div class="features__copy">
              <h3>{{ feature.title }}</h3>
              <p>{{ feature.description }}</p>
            </div>
          </article>
        </div>

        <div class="section-cta" data-reveal>
          <a :href="startFreeHref" class="btn btn--primary">
            <i class="bi bi-book-half" aria-hidden="true"></i>
            {{ t('homepage.features.cta') }}
          </a>
        </div>
      </div>
    </section>

    <section id="steps" class="steps">
      <div class="wrap">
        <header class="section-head" data-reveal>
          <p class="section-kicker">{{ t('homepage.steps.kicker') }}</p>
          <h2 class="section-title">{{ t('homepage.steps.title') }}</h2>
          <p class="section-sub">{{ t('homepage.steps.subtitle') }}</p>
        </header>

        <ol class="steps__list" data-reveal>
          <li v-for="(step, idx) in steps" :key="step.id" class="steps__item">
            <span class="steps__num" aria-hidden="true">{{ idx + 1 }}</span>
            <div>
              <h3>{{ step.title }}</h3>
              <p>{{ step.description }}</p>
            </div>
          </li>
        </ol>
      </div>
    </section>

    <section id="waiting-list" class="waitlist" aria-labelledby="waitlist-title">
      <div class="wrap wrap--tight">
        <div class="waitlist__band" data-reveal>
          <div>
            <p class="waitlist__kicker">{{ t('homepage.waitlist.kicker') }}</p>
            <h2 id="waitlist-title">{{ t('homepage.waitlist.title') }}</h2>
            <p>{{ t('homepage.waitlist.subtitle') }}</p>
          </div>
          <a href="/waiting-list" class="btn btn--primary">
            <i class="bi bi-envelope-open" aria-hidden="true"></i>
            {{ t('homepage.waitlist.cta') }}
          </a>
        </div>
      </div>
    </section>

    <section id="faq" class="faq">
      <div class="wrap">
        <header class="section-head" data-reveal>
          <p class="section-kicker">{{ t('homepage.faq.kicker') }}</p>
          <h2 class="section-title">{{ t('homepage.faq.title') }}</h2>
          <p class="section-sub">{{ t('homepage.faq.subtitle') }}</p>
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

    <section id="contact" class="contact">
      <div class="wrap wrap--tight">
        <div class="contact__panel" data-reveal>
          <header class="contact__head">
            <p class="section-kicker section-kicker--left">{{ t('homepage.contact.kicker') }}</p>
            <h2>{{ t('homepage.contact.title') }}</h2>
            <p>{{ t('homepage.contact.extendedSubtitle') }}</p>
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
            <div class="contact__row">
              <div>
                <label class="form-label" for="contactName">{{ t('homepage.name') }}</label>
                <input id="contactName" v-model.trim="contactForm.name" type="text" class="form-control" :class="{ 'is-invalid': contactErrors.name }" autocomplete="name">
                <div v-if="contactErrors.name" class="invalid-feedback d-block">{{ contactErrors.name }}</div>
              </div>
              <div>
                <label class="form-label" for="contactEmail">{{ t('homepage.contact.email') }}</label>
                <input id="contactEmail" v-model.trim="contactForm.email" type="email" class="form-control" :class="{ 'is-invalid': contactErrors.email }" autocomplete="email">
                <div v-if="contactErrors.email" class="invalid-feedback d-block">{{ contactErrors.email }}</div>
              </div>
            </div>
            <div>
              <label class="form-label" for="contactSubject">{{ t('homepage.contact.subject') }}</label>
              <input id="contactSubject" v-model.trim="contactForm.subject" type="text" class="form-control" :class="{ 'is-invalid': contactErrors.subject }" autocomplete="off" required>
              <div v-if="contactErrors.subject" class="invalid-feedback d-block">{{ contactErrors.subject }}</div>
            </div>
            <div>
              <label class="form-label" for="contactMessage">{{ t('homepage.contact.message') }}</label>
              <textarea id="contactMessage" v-model.trim="contactForm.message" class="form-control" :class="{ 'is-invalid': contactErrors.message }" rows="3"></textarea>
              <div v-if="contactErrors.message" class="invalid-feedback d-block">{{ contactErrors.message }}</div>
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
            <p>{{ t('homepage.focused_quran_memorisation_tools_for_recitation_ch') }}</p>
          </div>
          <div class="footer__links">
            <h4>{{ t('homepage.footer.product') }}</h4>
            <a href="#how-it-works" @click.prevent="scrollToId('how-it-works')">{{ t('homepage.footer.howItWorks') }}</a>
            <a href="#demo" @click.prevent="scrollToId('demo')">{{ t('homepage.footer.demo') }}</a>
            <a href="#features" @click.prevent="scrollToFeatures">{{ t('homepage.footer.features') }}</a>
            <a href="/waiting-list">{{ t('homepage.footer.waitlist') }}</a>
          </div>
          <div class="footer__links">
            <h4>{{ t('homepage.footer.company') }}</h4>
            <a href="/about-us">{{ t('homepage.footer.aboutUs') }}</a>
            <a href="#contact" @click.prevent="scrollToId('contact')">{{ t('homepage.footer.contact') }}</a>
            <a href="#faq" @click.prevent="scrollToId('faq')">{{ t('homepage.footer.faq') }}</a>
          </div>
        </div>
        <div class="footer__bottom">
          <p>{{ t('homepage.footer.tagline') }}</p>
          <span>{{ t('homepage.all_rights_reserved') }}</span>
        </div>
      </div>
    </footer>
  </div>
</template>

<script>
import { reactive, ref, computed, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { getSavedTheme, setGlobalTheme } from '../utils/theme';

export default {
  name: 'Homepage',
  setup() {
    const { t } = useI18n();
    const currentTheme = ref(getSavedTheme());
    const featuresSection = ref(null);
    const demoVideo = ref(null);
    const demoPlaying = ref(false);
    const demoActiveIndex = ref(0);
    const demoPoster = '/videos/product-pipeline-demo-poster.jpg';
    const DEMO_STEP_SPAN = 2.25; // frameDuration - fade from product-pipeline-demo.json
    let revealObserver = null;
    let demoObserver = null;

    const applyTheme = () => {
      currentTheme.value = getSavedTheme();
      setGlobalTheme(currentTheme.value, { dispatchEvent: false });
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

    const startFreeHref = computed(() => (
      window.mutqinAuthCheck ? '/memorisation' : '/memorisation/demo'
    ));

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

    const heroShots = computed(() => [
      { id: 'left', src: '/images/landing/hero-left.jpg', alt: t('homepage.shots.check') },
      { id: 'center', src: '/images/landing/hero-center.jpg', alt: t('homepage.shots.hero') },
      { id: 'right', src: '/images/landing/hero-right.jpg', alt: t('homepage.shots.next') },
    ]);

    const features = computed(() => [
      {
        id: 'setup',
        image: '/images/landing/feature-setup.jpg',
        title: t('homepage.features.items.setup.title'),
        description: t('homepage.features.items.setup.description'),
        shotAlt: t('homepage.shots.setup'),
      },
      {
        id: 'tools',
        image: '/images/landing/feature-tools.jpg',
        title: t('homepage.features.items.tools.title'),
        description: t('homepage.features.items.tools.description'),
        shotAlt: t('homepage.shots.tools'),
      },
      {
        id: 'check',
        image: '/images/landing/feature-check.jpg',
        title: t('homepage.features.items.check.title'),
        description: t('homepage.features.items.check.description'),
        shotAlt: t('homepage.shots.check'),
      },
      {
        id: 'next',
        image: '/images/landing/feature-next.jpg',
        title: t('homepage.features.items.next.title'),
        description: t('homepage.features.items.next.description'),
        shotAlt: t('homepage.shots.next'),
      },
    ]);

    const howItems = computed(() => [
      {
        id: 'choose',
        image: '/images/landing/how-1-setup.jpg',
        title: t('homepage.how.items.choose.title'),
        description: t('homepage.how.items.choose.description'),
        detail: t('homepage.how.items.choose.detail'),
        shotAlt: t('homepage.shots.setup'),
      },
      {
        id: 'recite',
        image: '/images/landing/how-2-recite.jpg',
        title: t('homepage.how.items.recite.title'),
        description: t('homepage.how.items.recite.description'),
        detail: t('homepage.how.items.recite.detail'),
        shotAlt: t('homepage.shots.check'),
      },
      {
        id: 'see',
        image: '/images/landing/how-3-result.jpg',
        title: t('homepage.how.items.see.title'),
        description: t('homepage.how.items.see.description'),
        detail: t('homepage.how.items.see.detail'),
        shotAlt: t('homepage.shots.result'),
      },
      {
        id: 'continue',
        image: '/images/landing/how-4-next.jpg',
        title: t('homepage.how.items.continue.title'),
        description: t('homepage.how.items.continue.description'),
        detail: t('homepage.how.items.continue.detail'),
        shotAlt: t('homepage.shots.next'),
      },
    ]);

    const steps = computed(() => [
      {
        id: 'sit',
        title: t('homepage.steps.items.sit.title'),
        description: t('homepage.steps.items.sit.description'),
      },
      {
        id: 'check',
        title: t('homepage.steps.items.check.title'),
        description: t('homepage.steps.items.check.description'),
      },
      {
        id: 'return',
        title: t('homepage.steps.items.return.title'),
        description: t('homepage.steps.items.return.description'),
      },
    ]);

    const faqItems = computed(() => [
      { id: 'whatIsMutqin', question: t('homepage.faq.items.whatIsMutqin.question'), answer: t('homepage.faq.items.whatIsMutqin.answer') },
      { id: 'howMemorisation', question: t('homepage.faq.items.howMemorisation.question'), answer: t('homepage.faq.items.howMemorisation.answer') },
      { id: 'howAiFeedback', question: t('homepage.faq.items.howAiFeedback.question'), answer: t('homepage.faq.items.howAiFeedback.answer') },
      { id: 'whatIsPro', question: t('homepage.faq.items.whatIsPro.question'), answer: t('homepage.faq.items.whatIsPro.answer') },
      { id: 'howRevision', question: t('homepage.faq.items.howRevision.question'), answer: t('homepage.faq.items.howRevision.answer') },
    ]);

    const demoSteps = computed(() => [
      { id: 'setup', label: t('homepage.pipelineDemo.steps.setup.label'), text: t('homepage.pipelineDemo.steps.setup.text') },
      { id: 'practise', label: t('homepage.pipelineDemo.steps.practise.label'), text: t('homepage.pipelineDemo.steps.practise.text') },
      { id: 'recite', label: t('homepage.pipelineDemo.steps.recite.label'), text: t('homepage.pipelineDemo.steps.recite.text') },
      { id: 'result', label: t('homepage.pipelineDemo.steps.result.label'), text: t('homepage.pipelineDemo.steps.result.text') },
      { id: 'next', label: t('homepage.pipelineDemo.steps.next.label'), text: t('homepage.pipelineDemo.steps.next.text') },
      { id: 'return', label: t('homepage.pipelineDemo.steps.return.label'), text: t('homepage.pipelineDemo.steps.return.text') },
    ]);

    const onDemoTimeUpdate = () => {
      const video = demoVideo.value;
      if (!video || !Number.isFinite(video.currentTime)) return;
      const nextIndex = Math.min(
        demoSteps.value.length - 1,
        Math.floor(video.currentTime / DEMO_STEP_SPAN),
      );
      if (nextIndex !== demoActiveIndex.value) demoActiveIndex.value = nextIndex;
    };

    const toggleDemoPlayback = async () => {
      const video = demoVideo.value;
      if (!video) return;
      if (video.paused) {
        try { await video.play(); } catch (_) { /* autoplay may be blocked */ }
      } else {
        video.pause();
      }
    };

    const seekDemoStep = async (idx) => {
      const video = demoVideo.value;
      if (!video) return;
      demoActiveIndex.value = idx;
      video.currentTime = idx * DEMO_STEP_SPAN + 0.05;
      try { await video.play(); } catch (_) { /* ignore */ }
    };

    onMounted(() => {
      applyTheme();
      window.addEventListener('mutqin:theme-change', onThemeChange);

      const nodes = document.querySelectorAll('[data-reveal]');
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduceMotion) {
        nodes.forEach((el) => el.classList.add('is-in'));
      } else {
        revealObserver = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('is-in');
            revealObserver.unobserve(entry.target);
          });
        }, { threshold: 0.14, rootMargin: '0px 0px -6% 0px' });

        nodes.forEach((el, i) => {
          el.style.setProperty('--stagger', `${Math.min(i * 40, 240)}ms`);
          revealObserver.observe(el);
        });
      }

      const video = demoVideo.value;
      if (video) {
        demoObserver = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (reduceMotion) {
              video.pause();
              return;
            }
            if (entry.isIntersecting && entry.intersectionRatio >= 0.45) {
              video.play().catch(() => {});
            } else {
              video.pause();
            }
          });
        }, { threshold: [0, 0.45, 0.75] });
        demoObserver.observe(video);
      }
    });

    onUnmounted(() => {
      window.removeEventListener('mutqin:theme-change', onThemeChange);
      revealObserver?.disconnect();
      demoObserver?.disconnect();
    });

    return {
      t,
      currentTheme,
      startFreeHref,
      featuresSection,
      scrollToFeatures,
      scrollToId,
      heroShots,
      features,
      howItems,
      steps,
      faqItems,
      demoVideo,
      demoPoster,
      demoPlaying,
      demoActiveIndex,
      demoSteps,
      onDemoTimeUpdate,
      toggleDemoPlayback,
      seekDemoStep,
      contactForm,
      contactErrors,
      contactStatus,
      contactSubmitting,
      submitContact,
    };
  },
};
</script>

<style src="./Homepage.css"></style>
