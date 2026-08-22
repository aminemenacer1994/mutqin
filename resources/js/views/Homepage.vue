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
              <a href="#how-it-works" class="btn btn--secondary" @click.prevent="scrollToId('how-it-works')">
                <i class="bi bi-play-circle" aria-hidden="true"></i>
                {{ t('homepage.hero.seeHow') }}
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
                <div class="device device--sm">
                  <div class="device__island" aria-hidden="true"></div>
                  <div class="device__screen">
                    <img
                      class="shot"
                      :src="shot.src"
                      :alt="shot.alt"
                      width="444"
                      height="929"
                      :loading="shot.id === 'center' ? 'eager' : 'lazy'"
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

    <section id="how-it-works" class="how" aria-labelledby="how-title">
      <div class="wrap">
        <header class="section-head" data-reveal>
          <p class="section-kicker">{{ t('homepage.how.kicker') }}</p>
          <h2 id="how-title" class="section-title">{{ t('homepage.how.title') }}</h2>
          <p class="section-sub">{{ t('homepage.how.subtitle') }}</p>
        </header>

        <div class="how__stage demo__stage" data-reveal>
          <div class="demo__phone">
            <div class="device device--demo">
              <div class="device__island" aria-hidden="true"></div>
              <div class="device__screen">
                <Transition name="demo-fade" mode="out-in">
                  <img
                    :key="demoSteps[demoActiveIndex]?.id"
                    class="shot demo__shot"
                    :src="demoSteps[demoActiveIndex]?.image"
                    :alt="demoSteps[demoActiveIndex]?.label || ''"
                    width="446"
                    height="930"
                    decoding="async"
                  >
                </Transition>
              </div>
            </div>
          </div>

          <div class="demo__story">
            <p class="demo__phase">
              {{ t('homepage.pipelineDemo.stepOf', { current: demoActiveIndex + 1, total: demoSteps.length }) }}
            </p>
            <h3 class="demo__headline">{{ demoSteps[demoActiveIndex]?.label }}</h3>
            <p class="demo__body">{{ demoSteps[demoActiveIndex]?.text }}</p>

            <div class="demo__chrome">
              <button
                type="button"
                class="demo__toggle"
                :aria-label="demoPlaying ? t('homepage.pipelineDemo.pause') : t('homepage.pipelineDemo.play')"
                @click="toggleDemoPlayback"
              >
                <i class="bi" :class="demoPlaying ? 'bi-pause-fill' : 'bi-play-fill'" aria-hidden="true"></i>
              </button>
              <div class="demo__progress" aria-hidden="true">
                <span class="demo__progress-bar" :style="{ width: `${demoProgress}%` }"></span>
              </div>
            </div>

            <ol class="demo__rail" :aria-label="t('homepage.pipelineDemo.pipelineLabel')">
              <li
                v-for="(step, idx) in demoSteps"
                :key="step.id"
                class="demo__rail-item"
                :class="{ 'is-active': idx === demoActiveIndex, 'is-done': idx < demoActiveIndex }"
              >
                <button type="button" class="demo__rail-btn" @click="seekDemoStep(idx)">
                  <span class="demo__rail-num" aria-hidden="true">{{ idx + 1 }}</span>
                  <span class="demo__rail-label">{{ step.label }}</span>
                </button>
              </li>
            </ol>
          </div>
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
            <div class="device device--sm features__device">
              <div class="device__island" aria-hidden="true"></div>
              <div class="device__screen">
                <img
                  class="shot"
                  :src="feature.image"
                  :alt="feature.shotAlt"
                  width="444"
                  height="929"
                  loading="lazy"
                  decoding="async"
                >
              </div>
            </div>
            <div class="features__copy">
              <h3>{{ feature.title }}</h3>
              <p>{{ feature.description }}</p>
            </div>
          </article>
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
                <input id="contactName" v-model.trim="contactForm.name" type="text" class="form-control" :class="{ 'is-invalid': contactErrors.name }" autocomplete="name">
                <div v-if="contactErrors.name" class="invalid-feedback d-block">{{ contactErrors.name }}</div>
              </div>
              <div class="contact__field">
                <label class="form-label" for="contactEmail">{{ t('homepage.contact.email') }}</label>
                <input id="contactEmail" v-model.trim="contactForm.email" type="email" class="form-control" :class="{ 'is-invalid': contactErrors.email }" autocomplete="email">
                <div v-if="contactErrors.email" class="invalid-feedback d-block">{{ contactErrors.email }}</div>
              </div>
            </div>
            <div class="contact__field">
              <label class="form-label" for="contactSubject">{{ t('homepage.contact.subject') }}</label>
              <input id="contactSubject" v-model.trim="contactForm.subject" type="text" class="form-control" :class="{ 'is-invalid': contactErrors.subject }" autocomplete="off" required>
              <div v-if="contactErrors.subject" class="invalid-feedback d-block">{{ contactErrors.subject }}</div>
            </div>
            <div class="contact__field">
              <label class="form-label" for="contactMessage">{{ t('homepage.contact.message') }}</label>
              <textarea id="contactMessage" v-model.trim="contactForm.message" class="form-control contact__message" :class="{ 'is-invalid': contactErrors.message }" rows="3"></textarea>
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
            <a href="#features" @click.prevent="scrollToFeatures">{{ t('homepage.footer.features') }}</a>
            <a href="#faq" @click.prevent="scrollToId('faq')">{{ t('homepage.footer.faq') }}</a>
          </div>
          <div class="footer__links">
            <h4>{{ t('homepage.footer.company') }}</h4>
            <a href="#contact" @click.prevent="scrollToId('contact')">{{ t('homepage.footer.contact') }}</a>
            <a href="/login">{{ t('homepage.footer.login') }}</a>
            <a href="/register">{{ t('homepage.footer.register') }}</a>
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
    const { t, locale } = useI18n();
    const currentTheme = ref(getSavedTheme());
    const featuresSection = ref(null);
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
          image: '/images/landing/journey-01-setup.jpg',
          label: t('homepage.pipelineDemo.steps.setup.label'),
          text: t('homepage.pipelineDemo.steps.setup.text'),
        },
        {
          id: 'practise',
          image: '/images/landing/journey-02-practise.jpg',
          label: t('homepage.pipelineDemo.steps.practise.label'),
          text: t('homepage.pipelineDemo.steps.practise.text'),
        },
        {
          id: 'check',
          image: '/images/landing/journey-03-check.jpg',
          label: t('homepage.pipelineDemo.steps.check.label'),
          text: t('homepage.pipelineDemo.steps.check.text'),
        },
        {
          id: 'complete',
          image: '/images/landing/journey-04-complete.jpg',
          label: t('homepage.pipelineDemo.steps.complete.label'),
          text: t('homepage.pipelineDemo.steps.complete.text'),
        },
        {
          id: 'result',
          image: '/images/landing/demo-step-5.jpg',
          label: t('homepage.pipelineDemo.steps.result.label'),
          text: t('homepage.pipelineDemo.steps.result.text'),
        },
        {
          id: 'recommend',
          image: '/images/landing/demo-step-6.jpg',
          label: t('homepage.pipelineDemo.steps.recommend.label'),
          text: t('homepage.pipelineDemo.steps.recommend.text'),
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
      window.mutqinAuthCheck ? '/memorisation' : '/register'
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

    const heroShots = computed(() => {
      void locale.value;
      return [
        { id: 'left', src: '/images/landing/hero-left.jpg', alt: t('homepage.shots.check') },
        { id: 'center', src: '/images/landing/hero-center.jpg', alt: t('homepage.shots.hero') },
        { id: 'right', src: '/images/landing/hero-right.jpg', alt: t('homepage.shots.next') },
      ];
    });

    const features = computed(() => {
      void locale.value;
      return [
        {
          id: 'setup',
          image: '/images/landing/feature-setup.jpg',
          title: t('homepage.features.items.setup.title'),
          description: t('homepage.features.items.setup.description'),
          shotAlt: t('homepage.shots.setup'),
        },
        {
          id: 'techniques',
          image: '/images/landing/feature-tools.jpg',
          title: t('homepage.features.items.techniques.title'),
          description: t('homepage.features.items.techniques.description'),
          shotAlt: t('homepage.shots.tools'),
        },
        {
          id: 'progress',
          image: '/images/landing/hero-right.jpg',
          title: t('homepage.features.items.progress.title'),
          description: t('homepage.features.items.progress.description'),
          shotAlt: t('homepage.shots.progress'),
        },
        {
          id: 'aiRecitation',
          image: '/images/landing/feature-check.jpg',
          title: t('homepage.features.items.aiRecitation.title'),
          description: t('homepage.features.items.aiRecitation.description'),
          shotAlt: t('homepage.shots.check'),
        },
        {
          id: 'mushafLayout',
          image: '/images/landing/journey-02-practise.jpg',
          title: t('homepage.features.items.mushafLayout.title'),
          description: t('homepage.features.items.mushafLayout.description'),
          shotAlt: t('homepage.shots.practise'),
        },
        {
          id: 'translationTajweed',
          image: '/images/landing/hero-center.jpg',
          title: t('homepage.features.items.translationTajweed.title'),
          description: t('homepage.features.items.translationTajweed.description'),
          shotAlt: t('homepage.shots.hero'),
        },
      ];
    });

    const faqItems = computed(() => {
      void locale.value;
      return [
        { id: 'whatIsMutqin', question: t('homepage.faq.items.whatIsMutqin.question'), answer: t('homepage.faq.items.whatIsMutqin.answer') },
        { id: 'howMemorisation', question: t('homepage.faq.items.howMemorisation.question'), answer: t('homepage.faq.items.howMemorisation.answer') },
        { id: 'accuracy', question: t('homepage.faq.items.accuracy.question'), answer: t('homepage.faq.items.accuracy.answer') },
        { id: 'privacy', question: t('homepage.faq.items.privacy.question'), answer: t('homepage.faq.items.privacy.answer') },
        { id: 'pricing', question: t('homepage.faq.items.pricing.question'), answer: t('homepage.faq.items.pricing.answer') },
        { id: 'howAiFeedback', question: t('homepage.faq.items.howAiFeedback.question'), answer: t('homepage.faq.items.howAiFeedback.answer') },
        { id: 'howRevision', question: t('homepage.faq.items.howRevision.question'), answer: t('homepage.faq.items.howRevision.answer') },
        { id: 'whoFor', question: t('homepage.faq.items.whoFor.question'), answer: t('homepage.faq.items.whoFor.answer') },
      ];
    });

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

      const howSection = document.getElementById('how-it-works');
      if (howSection) {
        demoObserver = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (reduceMotion) {
              stopDemoPlayback();
              return;
            }
            if (entry.isIntersecting && entry.intersectionRatio >= 0.35) startDemoPlayback();
            else stopDemoPlayback();
          });
        }, { threshold: [0, 0.35, 0.75] });
        demoObserver.observe(howSection);
      }
    });

    onUnmounted(() => {
      window.removeEventListener('mutqin:theme-change', onThemeChange);
      revealObserver?.disconnect();
      demoObserver?.disconnect();
      clearDemoTimer();
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
    };
  },
};
</script>

<style src="./Homepage.css"></style>
