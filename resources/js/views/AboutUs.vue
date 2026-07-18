<template>
  <section class="story-page">
    <div class="story-shell">
      <div class="story-hero">
        <div class="story-copy">
          <span class="story-kicker">{{ t('aboutUs.kicker') }}</span>
          <h1>{{ t('aboutUs.built_for_focused_quran_practice') }}</h1>
          <p class="story-lead">
            Mutqin helps students memorise, revise, and return to weak ayahs without getting lost in clutter.
            The experience is designed to feel calm, direct, and supportive from the first session onward.
          </p>

          <div class="story-signals">
            <span><i class="bi bi-stars"></i> {{ t('aboutUs.calm_study_flow') }}</span>
            <span><i class="bi bi-arrow-repeat"></i> {{ t('aboutUs.revision_led_learning') }}</span>
            <span><i class="bi bi-shield-check"></i> {{ t('aboutUs.built_around_consistency') }}</span>
          </div>
        </div>

        <aside class="story-panel" aria-label="Mutqin summary">
          <span class="story-panel-label">{{ t('aboutUs.why_people_stay') }}</span>
          <strong>{{ t('aboutUs.less_friction_clearer_progress_better_return_point') }}</strong>
          <ul>
            <li><i class="bi bi-check2-circle"></i> {{ t('aboutUs.session_setup_is_simple_enough_for_daily_use') }}</li>
            <li><i class="bi bi-check2-circle"></i> {{ t('aboutUs.revision_signals_help_learners_revisit_what_needs_') }}</li>
            <li><i class="bi bi-check2-circle"></i> {{ t('aboutUs.the_interface_stays_focused_instead_of_overwhelmin') }}</li>
          </ul>
        </aside>
      </div>

      <div class="story-columns">
        <article>
          <span class="story-icon"><i class="bi bi-compass"></i></span>
          <h2>{{ t('aboutUs.why_it_exists') }}</h2>
          <p>
            Many learners can repeat well in one sitting but struggle to keep review organised over time.
            Mutqin reduces that uncertainty and makes the next useful step easier to spot.
          </p>
        </article>
        <article>
          <span class="story-icon"><i class="bi bi-journal-text"></i></span>
          <h2>{{ t('aboutUs.what_it_does') }}</h2>
          <p>
            It brings session setup, saved progress, recitation checks, and revision signals into one
            calmer workspace that supports everyday memorisation.
          </p>
        </article>
        <article>
          <span class="story-icon"><i class="bi bi-people"></i></span>
          <h2>{{ t('aboutUs.what_it_respects') }}</h2>
          <p>
            It supports real study, teacher guidance, and consistent revision. The product is there to
            clarify the routine, not replace it.
          </p>
        </article>
      </div>

      <div class="story-band">
        <div>
          <span class="story-band-label">{{ t('aboutUs.the_product_principle') }}</span>
          <p>
            Every part of Mutqin is shaped around one question: does this make the student more likely to
            return tomorrow with confidence?
          </p>
        </div>
        <div class="story-band-metrics">
          <span>{{ t('aboutUs.focused_workflow') }}</span>
          <span>{{ t('aboutUs.reliable_revision') }}</span>
          <span>{{ t('aboutUs.cleaner_decisions') }}</span>
        </div>
      </div>
    </div>
  </section>
</template>

<script>
export default {
  name: 'AboutUsPage'
};
</script>

<style scoped>
.story-page {
  position: relative;
  overflow: hidden;
  padding: calc(var(--nav-h, 70px) + clamp(24px, 4vw, 44px)) 0 72px;
}

.story-page::before,
.story-page::after {
  content: '';
  position: absolute;
  border-radius: 999px;
  pointer-events: none;
  filter: blur(2px);
}

.story-page::before {
  top: 48px;
  right: -120px;
  width: 340px;
  height: 340px;
  background: radial-gradient(circle, color-mix(in srgb, var(--accent) 18%, transparent), transparent 68%);
  animation: storyDrift 9s ease-in-out infinite;
}

.story-page::after {
  left: -90px;
  bottom: 40px;
  width: 280px;
  height: 280px;
  background: radial-gradient(circle, color-mix(in srgb, var(--accent-strong) 12%, transparent), transparent 70%);
  animation: storyDrift 11s ease-in-out infinite reverse;
}

.story-shell {
  position: relative;
  z-index: 1;
  width: min(1120px, calc(100% - 32px));
  margin: 0 auto;
  display: grid;
  gap: 20px;
}

.story-hero {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr));
  gap: 20px;
  align-items: stretch;
}

.story-copy,
.story-panel,
.story-columns article,
.story-band {
  animation: storyReveal 0.65s ease both;
}

.story-copy {
  padding: clamp(20px, 3vw, 30px);
  border-radius: 34px;
  background:
    radial-gradient(circle at top left, color-mix(in srgb, var(--field-bg-strong) 72%, transparent), transparent 34%),
    linear-gradient(135deg, color-mix(in srgb, var(--surface-strong) 92%, var(--surface-elevated, var(--surface))), color-mix(in srgb, var(--surface-soft, var(--surface)) 72%, var(--surface)));
  border: 1px solid color-mix(in srgb, var(--accent) 16%, var(--border));
  box-shadow: var(--shadow-md);
}

.story-kicker,
.story-panel-label,
.story-band-label {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  padding: 8px 12px;
  border-radius: 999px;
  background: var(--accent-light);
  color: var(--accent-strong);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.story-copy h1 {
  margin: 18px 0 16px;
  font-size: clamp(2.5rem, 5vw, 4.35rem);
  line-height: 0.98;
  letter-spacing: -0.05em;
  color: var(--text);
}

.story-lead {
  max-width: 62ch;
  margin: 0;
  color: var(--text-muted);
  font-size: 1.05rem;
  line-height: 1.9;
}

.story-signals {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 20px;
}

.story-signals span {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 13px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--surface-strong) 72%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent) 12%, var(--border));
  color: var(--text);
  font-size: 0.94rem;
  font-weight: 700;
  box-shadow: var(--shadow-sm);
}

.story-signals i,
.story-panel li i,
.story-icon i {
  color: var(--accent);
}

.story-panel {
  display: grid;
  gap: 14px;
  align-content: start;
  padding: clamp(18px, 2.6vw, 24px);
  border-radius: 30px;
  background: color-mix(in srgb, var(--surface-strong) 78%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent) 14%, var(--border));
  box-shadow: var(--shadow-md);
  backdrop-filter: blur(14px);
}

.story-panel strong {
  font-size: 1.4rem;
  line-height: 1.2;
  color: var(--text);
}

.story-panel ul {
  display: grid;
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.story-panel li {
  display: flex;
  gap: 10px;
  color: var(--text-muted);
  line-height: 1.75;
}

.story-columns {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr));
  gap: 16px;
}

.story-columns article {
  padding: 22px 20px 20px;
  border-radius: 28px;
  background: color-mix(in srgb, var(--surface-strong) 76%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent) 12%, var(--border));
  box-shadow: var(--shadow-sm);
  transition: transform 0.28s ease, box-shadow 0.28s ease, border-color 0.28s ease;
}

.story-columns article:hover {
  transform: translateY(-4px);
  border-color: color-mix(in srgb, var(--accent) 24%, var(--border));
  box-shadow: var(--shadow-md);
}

.story-icon {
  width: 52px;
  height: 52px;
  margin-bottom: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 18px;
  background: var(--accent-light);
  font-size: 1.35rem;
}

.story-columns h2 {
  margin: 0 0 12px;
  color: var(--text);
  font-size: 1.35rem;
  letter-spacing: -0.02em;
}

.story-columns p,
.story-band p {
  margin: 0;
  color: var(--text-muted);
  line-height: 1.88;
}

.story-band {
  display: grid;
  gap: 14px;
  padding: 20px 22px;
  border-radius: 30px;
  background:
    radial-gradient(circle at top left, color-mix(in srgb, var(--field-bg-strong) 16%, transparent), transparent 28%),
    linear-gradient(135deg, color-mix(in srgb, var(--accent-strong) 72%, var(--surface-strong)), color-mix(in srgb, var(--accent) 82%, var(--surface)));
  color: var(--text-on-accent, #fffaf5);
  box-shadow: var(--shadow-lg);
}

.story-band p {
  margin-top: 14px;
  color: var(--text-on-accent-muted, rgba(255, 250, 245, 0.82));
  max-width: 62ch;
}

.story-band-metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.story-band-metrics span {
  display: inline-flex;
  align-items: center;
  min-height: 42px;
  padding: 0 14px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--text-on-accent, #fffaf5) 14%, transparent);
  border: 1px solid color-mix(in srgb, var(--text-on-accent, #fffaf5) 22%, transparent);
  color: var(--text-on-accent, #fffaf5);
  font-weight: 700;
}

@keyframes storyReveal {
  from {
    opacity: 0;
    transform: translateY(14px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes storyDrift {
  0%,
  100% {
    transform: translate3d(0, 0, 0);
  }

  50% {
    transform: translate3d(0, 14px, 0);
  }
}

@media (max-width: 767.98px) {
  .story-page {
    box-sizing: border-box;
    width: 100%;
    max-width: 100%;
    padding: 1.25rem 0 2.25rem;
  }

  .story-page::before,
  .story-page::after {
    width: min(68vw, 220px);
    height: min(68vw, 220px);
  }

  .story-page::before {
    right: 0;
  }

  .story-page::after {
    left: 0;
  }

  .story-shell,
  .story-hero,
  .story-copy,
  .story-panel,
  .story-columns,
  .story-columns article,
  .story-band {
    box-sizing: border-box;
    width: 100%;
    max-width: 100%;
    min-width: 0;
  }

  .story-shell {
    width: calc(100% - clamp(1.5rem, 7.6vw, 2rem));
    gap: 0.85rem;
  }

  .story-hero,
  .story-columns {
    grid-template-columns: minmax(0, 1fr);
    gap: 0.85rem;
  }

  .story-copy,
  .story-panel,
  .story-columns article,
  .story-band {
    padding: 1rem;
    border-radius: 20px;
  }

  .story-copy h1 {
    margin: 0.9rem 0 0.75rem;
    font-size: clamp(2rem, 11vw, 2.8rem);
    line-height: 1.03;
    letter-spacing: -0.035em;
    overflow-wrap: break-word;
  }

  .story-lead,
  .story-panel li,
  .story-columns p,
  .story-band p,
  .story-band-metrics span {
    min-width: 0;
    line-height: 1.65;
    overflow-wrap: break-word;
  }

  .story-signals,
  .story-band-metrics {
    gap: 0.5rem;
  }

  .story-signals span,
  .story-band-metrics span {
    max-width: 100%;
    min-width: 0;
    min-height: 44px;
    white-space: normal;
    overflow-wrap: anywhere;
  }

  .story-panel,
  .story-panel ul {
    grid-template-columns: minmax(0, 1fr);
  }

  .story-panel strong,
  .story-panel li {
    min-width: 0;
    overflow-wrap: anywhere;
  }

  .story-page {
    --story-mobile-grid: repeat(4, minmax(0, 1fr));
    --story-mobile-gap: clamp(8px, 2.3vw, 12px);
  }

  .story-shell,
  .story-hero,
  .story-columns,
  .story-signals,
  .story-band,
  .story-band-metrics {
    display: grid !important;
    grid-template-columns: var(--story-mobile-grid) !important;
    gap: var(--story-mobile-gap) !important;
  }

  .story-shell > * {
    grid-column: 1 / -1;
  }

  .story-copy {
    grid-column: 1 / span 2;
  }

  .story-panel {
    grid-column: 3 / -1;
  }

  .story-columns > article,
  .story-signals > span,
  .story-band-metrics > span {
    grid-column: span 2;
    min-width: 0;
  }

  .story-band > :first-child {
    grid-column: 1 / span 2;
  }

  .story-band > :last-child {
    grid-column: 3 / -1;
  }
}

@media (max-width: 349.98px) {
  .story-copy,
  .story-panel,
  .story-band > :first-child,
  .story-band > :last-child {
    grid-column: 1 / -1;
  }
}

@media (max-width: 559.98px) {
  .story-copy,
  .story-panel,
  .story-band > :first-child,
  .story-band > :last-child {
    grid-column: 1 / -1;
  }

  .story-panel ul {
    display: grid;
    grid-template-columns: var(--story-mobile-grid);
    gap: var(--story-mobile-gap);
  }

  .story-panel li {
    grid-column: span 2;
  }

  .story-panel li:last-child:nth-child(odd),
  .story-signals > span:last-child:nth-child(odd),
  .story-columns > article:last-child:nth-child(odd) {
    grid-column: 1 / -1;
  }

  .story-band-metrics > span {
    grid-column: span 1;
    padding-inline: 8px;
  }
}

@media (min-width: 560px) and (max-width: 767.98px) {
  .story-columns > article {
    grid-column: span 2;
  }
}

</style>
