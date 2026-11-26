import { onMounted, onUnmounted } from 'vue';

export function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
}

export function revealAll(nodes) {
  nodes.forEach((el) => el.classList.add('is-in'));
}

/**
 * IntersectionObserver reveal for marketing sections.
 * @param {object} options
 * @param {ParentNode | null} [options.root]
 * @param {string} [options.selector]
 * @param {number} [options.threshold]
 * @param {string} [options.rootMargin]
 * @param {number} [options.staggerStep]
 * @param {number} [options.staggerCap]
 * @returns {() => void} disconnect
 */
export function bindRevealObserver({
  root = null,
  selector = '[data-reveal]',
  threshold = 0.14,
  rootMargin = '0px 0px -6% 0px',
  staggerStep = 40,
  staggerCap = 240,
} = {}) {
  const scope = root instanceof Element ? root : document;
  const nodes = scope.querySelectorAll(selector);
  if (!nodes.length) {
    return () => {};
  }

  if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
    revealAll(nodes);
    return () => {};
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-in');
      observer.unobserve(entry.target);
    });
  }, { threshold, rootMargin });

  nodes.forEach((el, index) => {
    el.style.setProperty('--stagger', `${Math.min(index * staggerStep, staggerCap)}ms`);
    observer.observe(el);
  });

  return () => observer.disconnect();
}

export function mountPreviewPageEnter(el) {
  if (!el || prefersReducedMotion()) return () => {};
  el.classList.add('preview-page-mount');
  const frame = requestAnimationFrame(() => {
    el.classList.add('preview-page-mount--in');
  });
  return () => cancelAnimationFrame(frame);
}

export function mountHeroEntrance(heroEl) {
  if (!heroEl) return () => {};
  heroEl.setAttribute('data-hero-stage', '1');

  if (prefersReducedMotion()) {
    heroEl.classList.add('hero--entered');
    return () => {};
  }

  const frame = requestAnimationFrame(() => {
    heroEl.classList.add('hero--entered');
  });

  return () => cancelAnimationFrame(frame);
}

export function usePreviewMotion(options = {}) {
  let disconnectReveals = () => {};
  let cleanupPageEnter = () => {};
  let cleanupHero = () => {};

  onMounted(() => {
    const root = options.root?.value ?? options.root ?? null;
    if (root instanceof Element) {
      cleanupPageEnter = mountPreviewPageEnter(root);
    }

    const hero = root instanceof Element
      ? root.querySelector('.hero')
      : document.querySelector('.homepage--preview .hero');
    cleanupHero = mountHeroEntrance(hero);

    disconnectReveals = bindRevealObserver({
      root: root || document.querySelector('.homepage--preview, .pricing-page--preview') || document,
      ...options,
    });
  });

  onUnmounted(() => {
    disconnectReveals();
    cleanupPageEnter();
    cleanupHero();
  });

  return { bindRevealObserver, prefersReducedMotion };
}