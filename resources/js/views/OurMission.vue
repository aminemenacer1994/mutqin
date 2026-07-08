<template>
  <section class="mission-page">
    <div class="mission-shell">
      <div class="mission-hero">
        <div class="mission-copy">
          <span class="mission-kicker">{{ t('mission.kicker') }}</span>
          <h1>{{ t('mission.make_consistent_quran_practice_easier_to_understan') }}</h1>
          <p class="mission-lead">
            Mutqin is designed to reduce friction so students can start quickly, revise calmly, and keep
            returning without confusion. The aim is a smoother routine, not a busier one.
          </p>
        </div>

        <aside class="mission-side-panel" aria-label="Mission summary">
          <span class="mission-side-label">{{ t('mission.what_that_means') }}</span>
          <div class="mission-side-list">
            <div>
              <strong>{{ t('mission.clear_entry_point') }}</strong>
              <p>{{ t('mission.beginners_should_know_what_to_do_in_the_first_minu') }}</p>
            </div>
            <div>
              <strong>{{ t('mission.reliable_revision_loop') }}</strong>
              <p>{{ t('mission.weak_ayahs_should_surface_before_they_become_large') }}</p>
            </div>
            <div>
              <strong>{{ t('mission.respect_for_real_study') }}</strong>
              <p>{{ t('mission.the_product_should_support_teachers_halaqah_and_pe') }}</p>
            </div>
          </div>
        </aside>
      </div>

      <div class="mission-roadmap">
        <article class="mission-step">
          <span class="mission-step-number">01</span>
          <strong>{{ t('mission.lower_the_barrier') }}</strong>
          <p>{{ t('mission.make_the_first_minute_simple_enough_for_beginners_') }}</p>
        </article>
        <article class="mission-step">
          <span class="mission-step-number">02</span>
          <strong>{{ t('mission.improve_retention') }}</strong>
          <p>{{ t('mission.surface_weak_ayahs_before_they_turn_into_larger_re') }}</p>
        </article>
        <article class="mission-step">
          <span class="mission-step-number">03</span>
          <strong>{{ t('mission.respect_real_study') }}</strong>
          <p>{{ t('mission.fit_naturally_alongside_a_teacher_halaqah_or_perso') }}</p>
        </article>
      </div>

      <div class="mission-band">
        <div>
          <span class="mission-band-label">{{ t('mission.how_success_looks') }}</span>
          <p>
            Students should leave every session with better clarity about what was memorised well, what needs
            revision, and what to return to next.
          </p>
        </div>
        <div class="mission-band-points">
          <span><i class="bi bi-book-half"></i> {{ t('mission.simpler_starts') }}</span>
          <span><i class="bi bi-activity"></i> {{ t('mission.stronger_retention') }}</span>
          <span><i class="bi bi-heart"></i> {{ t('mission.more_confidence') }}</span>
        </div>
      </div>
    </div>
  </section>
</template>

<script>
export default {
  name: 'OurMissionPage'
};
</script>

<style scoped>
.mission-page {
  position: relative;
  overflow: hidden;
  padding: calc(var(--nav-h, 70px) + clamp(24px, 4vw, 44px)) 0 72px;
}

.mission-page::before,
.mission-page::after {
  content: '';
  position: absolute;
  border-radius: 999px;
  pointer-events: none;
}

.mission-page::before {
  top: 58px;
  left: -110px;
  width: 320px;
  height: 320px;
  background: radial-gradient(circle, color-mix(in srgb, var(--accent) 18%, transparent), transparent 70%);
  animation: missionFloat 10s ease-in-out infinite;
}

.mission-page::after {
  right: -90px;
  bottom: 30px;
  width: 260px;
  height: 260px;
  background: radial-gradient(circle, color-mix(in srgb, var(--accent-strong) 10%, transparent), transparent 68%);
  animation: missionFloat 12s ease-in-out infinite reverse;
}

.mission-shell {
  position: relative;
  z-index: 1;
  width: min(1120px, calc(100% - 32px));
  margin: 0 auto;
  display: grid;
  gap: 20px;
}

.mission-hero {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr));
  gap: 20px;
  align-items: stretch;
}

.mission-copy,
.mission-side-panel,
.mission-step,
.mission-band {
  animation: missionReveal 0.7s ease both;
}

.mission-copy {
  padding: clamp(20px, 3vw, 30px);
  border-radius: 34px;
  background:
    radial-gradient(circle at top left, color-mix(in srgb, var(--field-bg-strong) 72%, transparent), transparent 34%),
    linear-gradient(135deg, color-mix(in srgb, var(--surface-strong) 92%, var(--surface-elevated, var(--surface))), color-mix(in srgb, var(--surface-soft, var(--surface)) 72%, var(--surface)));
  border: 1px solid color-mix(in srgb, var(--accent) 16%, var(--border));
  box-shadow: var(--shadow-md);
}

.mission-kicker,
.mission-side-label,
.mission-band-label {
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

.mission-copy h1 {
  margin: 18px 0 16px;
  font-size: clamp(2.5rem, 5vw, 4.4rem);
  line-height: 0.99;
  letter-spacing: -0.05em;
  color: var(--text);
}

.mission-lead {
  max-width: 62ch;
  margin: 0;
  color: var(--text-muted);
  font-size: 1.05rem;
  line-height: 1.9;
}

.mission-side-panel {
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

.mission-side-list {
  display: grid;
  gap: 18px;
}

.mission-side-list strong {
  display: block;
  margin-bottom: 6px;
  color: var(--text);
  font-size: 1.02rem;
}

.mission-side-list p,
.mission-step p,
.mission-band p {
  margin: 0;
  color: var(--text-muted);
  line-height: 1.82;
}

.mission-roadmap {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr));
  gap: 16px;
}

.mission-step {
  padding: 20px;
  border-radius: 28px;
  background: color-mix(in srgb, var(--surface-strong) 76%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent) 12%, var(--border));
  box-shadow: var(--shadow-sm);
  transition: transform 0.28s ease, box-shadow 0.28s ease, border-color 0.28s ease;
}

.mission-step:hover {
  transform: translateY(-4px);
  border-color: color-mix(in srgb, var(--accent) 24%, var(--border));
  box-shadow: var(--shadow-md);
}

.mission-step-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 48px;
  height: 48px;
  margin-bottom: 16px;
  padding: 0 14px;
  border-radius: 16px;
  background: var(--accent-light);
  color: var(--accent);
  font-size: 0.95rem;
  font-weight: 800;
  letter-spacing: 0.04em;
}

.mission-step strong {
  display: block;
  margin-bottom: 10px;
  color: var(--text);
  font-size: 1.3rem;
  letter-spacing: -0.02em;
}

.mission-band {
  display: grid;
  gap: 14px;
  padding: 20px 22px;
  border-radius: 30px;
  background:
    radial-gradient(circle at top left, color-mix(in srgb, var(--text-on-accent, #fffaf5) 14%, transparent), transparent 28%),
    linear-gradient(135deg, color-mix(in srgb, var(--accent-strong) 72%, var(--surface-strong)), color-mix(in srgb, var(--accent) 82%, var(--surface)));
  color: var(--text-on-accent, #fffaf5);
  box-shadow: var(--shadow-lg);
}

.mission-band p {
  margin-top: 14px;
  color: var(--text-on-accent-muted, rgba(255, 250, 245, 0.82));
  max-width: 62ch;
}

.mission-band-points {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.mission-band-points span {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 42px;
  padding: 0 14px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--text-on-accent, #fffaf5) 14%, transparent);
  border: 1px solid color-mix(in srgb, var(--text-on-accent, #fffaf5) 20%, transparent);
  color: var(--text-on-accent, #fffaf5);
  font-weight: 700;
}

@keyframes missionReveal {
  from {
    opacity: 0;
    transform: translateY(16px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes missionFloat {
  0%,
  100% {
    transform: translate3d(0, 0, 0);
  }

  50% {
    transform: translate3d(0, 16px, 0);
  }
}

</style>
