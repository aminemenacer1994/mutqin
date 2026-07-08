<template>
  <section class="donation-page">
    <div class="donation-shell">
      <div class="donation-hero">
        <div class="donation-copy">
          <span class="donation-kicker">{{ t('donate.donate') }}</span>
          <h1>{{ t('donate.support_a_simpler_memorisation_experience') }}</h1>
          <p class="donation-lead">
            Support helps improve the product, refine the learning flow, and keep Mutqin easier to use for
            students returning every day. The goal is thoughtful iteration that makes study feel calmer.
          </p>

          <div class="donation-signals">
            <span><i class="bi bi-tools"></i> {{ t('donate.product_maintenance') }}</span>
            <span><i class="bi bi-lightning-charge"></i> {{ t('donate.faster_iteration') }}</span>
            <span><i class="bi bi-heart"></i> {{ t('donate.better_student_experience') }}</span>
          </div>
        </div>

        <aside class="donation-focus">
          <span class="donation-focus-label">{{ t('donate.support_focus') }}</span>
          <strong>{{ t('donate.fund_the_next_practical_improvements_students_feel') }}</strong>
          <p>
            Contributions help shape onboarding, revision clarity, and the everyday usability details that
            make Mutqin easier to return to.
          </p>
        </aside>
      </div>

      <div class="donation-grid">
        <article class="donation-tier">
          <span class="donation-tier-badge">{{ t('donate.flexible') }}</span>
          <strong>{{ t('donate.one_time_support') }}</strong>
          <p>{{ t('donate.help_with_ongoing_improvements_maintenance_and_car') }}</p>
        </article>
        <article class="donation-tier donation-tier-featured">
          <span class="donation-tier-badge">{{ t('memorisation.badges.steady') }}</span>
          <strong>{{ t('donate.monthly_support') }}</strong>
          <p>{{ t('donate.support_steady_iteration_on_onboarding_revision_an') }}</p>
        </article>
        <article class="donation-tier">
          <span class="donation-tier-badge">{{ t('donate.targeted') }}</span>
          <strong>{{ t('donate.project_support') }}</strong>
          <p>{{ t('donate.back_focused_improvements_for_a_specific_part_of_t') }}</p>
        </article>
      </div>

      <div class="donation-cta">
        <div>
          <span class="donation-cta-label">{{ t('donate.start_the_conversation') }}</span>
          <p>{{ t('donate.if_you_want_to_support_mutqin_contact_us_with_the_') }}</p>
        </div>
        <a href="/#contact">{{ t('donate.contact_us') }}</a>
      </div>
    </div>
  </section>
</template>

<script>
export default {
  name: 'DonationPage'
};
</script>

<style scoped>
.donation-page {
  position: relative;
  overflow: hidden;
  padding: calc(var(--nav-h, 70px) + clamp(24px, 4vw, 44px)) 0 72px;
}

.donation-page::before,
.donation-page::after {
  content: '';
  position: absolute;
  border-radius: 999px;
  pointer-events: none;
}

.donation-page::before {
  top: 44px;
  right: -120px;
  width: 340px;
  height: 340px;
  background: radial-gradient(circle, color-mix(in srgb, var(--accent) 18%, transparent), transparent 68%);
  animation: donationFloat 10s ease-in-out infinite;
}

.donation-page::after {
  left: -80px;
  bottom: 36px;
  width: 260px;
  height: 260px;
  background: radial-gradient(circle, color-mix(in srgb, var(--accent-strong) 12%, transparent), transparent 70%);
  animation: donationFloat 12s ease-in-out infinite reverse;
}

.donation-shell {
  position: relative;
  z-index: 1;
  width: min(1120px, calc(100% - 32px));
  margin: 0 auto;
  display: grid;
  gap: 20px;
}

.donation-hero {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr));
  gap: 20px;
  align-items: stretch;
}

.donation-copy,
.donation-focus,
.donation-tier,
.donation-cta {
  animation: donationReveal 0.7s ease both;
}

.donation-copy {
  padding: clamp(20px, 3vw, 30px);
  border-radius: 34px;
  background:
    radial-gradient(circle at top left, color-mix(in srgb, var(--field-bg-strong) 72%, transparent), transparent 34%),
    linear-gradient(135deg, color-mix(in srgb, var(--surface-strong) 92%, var(--surface-elevated, var(--surface))), color-mix(in srgb, var(--surface-soft, var(--surface)) 72%, var(--surface)));
  border: 1px solid color-mix(in srgb, var(--accent) 16%, var(--border));
  box-shadow: var(--shadow-md);
}

.donation-kicker,
.donation-focus-label,
.donation-cta-label {
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

.donation-copy h1 {
  margin: 18px 0 16px;
  font-size: clamp(2.5rem, 5vw, 4.4rem);
  line-height: 0.98;
  letter-spacing: -0.05em;
  color: var(--text);
}

.donation-lead {
  max-width: 62ch;
  margin: 0;
  color: var(--text-muted);
  font-size: 1.05rem;
  line-height: 1.9;
}

.donation-signals {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 20px;
}

.donation-signals span {
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

.donation-signals i {
  color: var(--accent);
}

.donation-focus {
  display: grid;
  gap: 12px;
  align-content: start;
  padding: clamp(18px, 2.6vw, 24px);
  border-radius: 30px;
  background:
    radial-gradient(circle at top right, color-mix(in srgb, var(--text-on-accent, #fffaf5) 14%, transparent), transparent 24%),
    linear-gradient(135deg, color-mix(in srgb, var(--accent-strong) 72%, var(--surface-strong)), color-mix(in srgb, var(--accent) 82%, var(--surface)));
  color: var(--text-on-accent, #fffaf5);
  box-shadow: var(--shadow-lg);
}

.donation-focus strong {
  font-size: 1.4rem;
  line-height: 1.2;
}

.donation-focus p {
  margin: 0;
  color: var(--text-on-accent-muted, rgba(255, 250, 245, 0.82));
  line-height: 1.82;
}

.donation-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr));
  gap: 16px;
}

.donation-tier {
  padding: 20px;
  border-radius: 28px;
  background: color-mix(in srgb, var(--surface-strong) 76%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent) 12%, var(--border));
  box-shadow: var(--shadow-sm);
  transition: transform 0.28s ease, box-shadow 0.28s ease, border-color 0.28s ease;
}

.donation-tier:hover {
  transform: translateY(-4px);
  border-color: color-mix(in srgb, var(--accent) 24%, var(--border));
  box-shadow: var(--shadow-md);
}

.donation-tier-featured {
  background:
    radial-gradient(circle at top left, color-mix(in srgb, var(--field-bg-strong) 58%, transparent), transparent 26%),
    linear-gradient(135deg, color-mix(in srgb, var(--surface-elevated, var(--surface)) 94%, transparent), color-mix(in srgb, var(--surface-soft, var(--surface)) 82%, var(--surface)));
  border-color: color-mix(in srgb, var(--accent) 22%, var(--border));
}

.donation-tier-badge {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  padding: 0 12px;
  margin-bottom: 16px;
  border-radius: 999px;
  background: var(--accent-light);
  color: var(--accent-strong);
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.donation-tier strong {
  display: block;
  margin-bottom: 10px;
  color: var(--text);
  font-size: 1.3rem;
  letter-spacing: -0.02em;
}

.donation-tier p {
  margin: 0;
  color: var(--text-muted);
  line-height: 1.82;
}

.donation-cta {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr));
  gap: 16px;
  align-items: center;
  padding: 20px 22px;
  border-radius: 30px;
  background: color-mix(in srgb, var(--surface-strong) 78%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent) 14%, var(--border));
  box-shadow: var(--shadow-sm);
}

.donation-cta p {
  margin: 14px 0 0;
  color: var(--text-muted);
  line-height: 1.82;
}

.donation-cta a {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-width: 152px;
  min-height: 48px;
  padding: 0 18px;
  border-radius: 16px;
  background: linear-gradient(135deg, var(--accent), var(--accent-strong));
  color: var(--text-on-accent, #fffaf5);
  text-decoration: none;
  font-weight: 800;
  box-shadow: var(--shadow-md);
  transition: transform 0.28s ease, box-shadow 0.28s ease;
}

.donation-cta a:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

@keyframes donationReveal {
  from {
    opacity: 0;
    transform: translateY(16px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes donationFloat {
  0%,
  100% {
    transform: translate3d(0, 0, 0);
  }

  50% {
    transform: translate3d(0, 16px, 0);
  }
}

</style>
