<template>
  <section class="story-page">
    <div class="story-shell">
      <div class="story-hero">
        <div class="story-copy">
          <span class="story-kicker">About Mutqin</span>
          <h1>Built for focused Quran practice.</h1>
          <p class="story-lead">
            Mutqin helps students memorise, revise, and return to weak ayahs without getting lost in clutter.
            The experience is designed to feel calm, direct, and supportive from the first session onward.
          </p>

          <div class="story-signals">
            <span><i class="bi bi-stars"></i> Calm study flow</span>
            <span><i class="bi bi-arrow-repeat"></i> Revision-led learning</span>
            <span><i class="bi bi-shield-check"></i> Built around consistency</span>
          </div>
        </div>

        <aside class="story-panel" aria-label="Mutqin summary">
          <span class="story-panel-label">Why people stay</span>
          <strong>Less friction, clearer progress, better return points.</strong>
          <ul>
            <li><i class="bi bi-check2-circle"></i> Session setup is simple enough for daily use.</li>
            <li><i class="bi bi-check2-circle"></i> Revision signals help learners revisit what needs attention.</li>
            <li><i class="bi bi-check2-circle"></i> The interface stays focused instead of overwhelming.</li>
          </ul>
        </aside>
      </div>

      <div class="story-columns">
        <article>
          <span class="story-icon"><i class="bi bi-compass"></i></span>
          <h2>Why it exists</h2>
          <p>
            Many learners can repeat well in one sitting but struggle to keep review organised over time.
            Mutqin reduces that uncertainty and makes the next useful step easier to spot.
          </p>
        </article>
        <article>
          <span class="story-icon"><i class="bi bi-journal-text"></i></span>
          <h2>What it does</h2>
          <p>
            It brings session setup, saved progress, recitation checks, and revision signals into one
            calmer workspace that supports everyday memorisation.
          </p>
        </article>
        <article>
          <span class="story-icon"><i class="bi bi-people"></i></span>
          <h2>What it respects</h2>
          <p>
            It supports real study, teacher guidance, and consistent revision. The product is there to
            clarify the routine, not replace it.
          </p>
        </article>
      </div>

      <div class="story-band">
        <div>
          <span class="story-band-label">The product principle</span>
          <p>
            Every part of Mutqin is shaped around one question: does this make the student more likely to
            return tomorrow with confidence?
          </p>
        </div>
        <div class="story-band-metrics">
          <span>Focused workflow</span>
          <span>Reliable revision</span>
          <span>Cleaner decisions</span>
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
  grid-template-columns: minmax(0, 1.35fr) minmax(280px, 0.85fr);
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
  background: rgba(154, 103, 56, 0.1);
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
  color: #fffaf5;
  box-shadow: var(--shadow-lg);
}

.story-band p {
  margin-top: 14px;
  color: rgba(255, 250, 245, 0.82);
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
  background: color-mix(in srgb, #ffffff 14%, transparent);
  border: 1px solid color-mix(in srgb, #ffffff 22%, transparent);
  color: #fffaf5;
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

@media (min-width: 900px) {
  .story-columns {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

</style>
