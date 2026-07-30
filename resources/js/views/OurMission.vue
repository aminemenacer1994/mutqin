<template>
  <section class="info-page">
    <div class="info-shell">
      <header class="info-header info-reveal">
        <span class="info-kicker"><i class="bi bi-compass" aria-hidden="true"></i> Mission</span>
        <h1>Our mission</h1>
        <p>
          Make consistent Qur’an memorisation easier to begin, easier to continue,
          and calmer to return to — without replacing a teacher.
        </p>
      </header>

      <section class="info-section info-reveal" style="--d: 60ms">
        <div class="info-icon" aria-hidden="true"><i class="bi bi-lightbulb"></i></div>
        <h2>Help people practise well</h2>
        <p>
          Guided practice, thoughtful repetition, and optional recitation assistance
          help students strengthen what they have memorised.
        </p>
      </section>

      <section class="info-section info-reveal" style="--d: 120ms">
        <div class="info-icon" aria-hidden="true"><i class="bi bi-arrow-repeat"></i></div>
        <h2>Support consistency</h2>
        <p>
          A clear next step after each session helps learners return before memorised ayahs begin to fade.
        </p>
      </section>

      <section class="info-section info-reveal" style="--d: 180ms">
        <div class="info-icon" aria-hidden="true"><i class="bi bi-shield-check"></i></div>
        <h2>Keep respect at the centre</h2>
        <p>
          Accuracy and respect for the Qur’an matter more than speed. Mutqin supports real study and teachers.
        </p>
      </section>

      <div class="info-actions info-reveal" style="--d: 240ms">
        <a class="info-btn info-btn--primary" href="/memorisation">Begin a session</a>
        <a class="info-btn info-btn--ghost" href="/donate">Support Mutqin</a>
      </div>
    </div>
  </section>
</template>

<script>
export default { name: 'OurMissionPage' };
</script>

<style scoped>
.info-page {
  padding: calc(var(--nav-h, 70px) + clamp(1.1rem, 3vw, 1.75rem)) 0 clamp(2.25rem, 5vw, 3.5rem);
}
.info-shell {
  width: min(40rem, calc(100% - clamp(1.5rem, 5vw, 2.5rem)));
  margin: 0 auto;
  display: grid;
  gap: clamp(1.1rem, 2.8vw, 1.5rem);
}
.info-kicker {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  min-height: 1.75rem;
  padding: 0.2rem 0.65rem;
  border-radius: 999px;
  background: var(--accent-light);
  color: var(--accent-strong);
  font-size: 0.75rem;
  font-weight: 650;
}
.info-header h1,
.info-section h2 {
  margin: 0.55rem 0 0.55rem;
  color: var(--text);
  font-weight: 620;
  letter-spacing: -0.02em;
}
.info-header h1 { font-size: clamp(1.55rem, 4.2vw, 2rem); line-height: 1.2; }
.info-section h2 { font-size: 1.05rem; line-height: 1.35; }
.info-header p,
.info-section p {
  margin: 0;
  max-width: 58ch;
  color: var(--text-muted);
  font-size: 0.98rem;
  line-height: 1.65;
  font-weight: 450;
}
.info-section {
  padding-top: 0.95rem;
  border-top: 1px solid color-mix(in srgb, var(--border) 88%, transparent);
}
.info-icon {
  width: 2.4rem;
  height: 2.4rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: var(--accent-light);
  color: var(--accent);
  font-size: 1.05rem;
}
.info-actions { display: grid; gap: 0.7rem; margin-top: 0.25rem; }
.info-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 0.7rem 1.1rem;
  border-radius: 14px;
  text-decoration: none;
  font-weight: 600;
}
.info-btn--primary {
  background: linear-gradient(135deg, var(--accent), var(--accent-strong));
  color: var(--text-on-accent, #fffaf5);
}
.info-btn--ghost {
  border: 1px solid color-mix(in srgb, var(--accent) 22%, var(--border));
  background: color-mix(in srgb, var(--surface-strong) 80%, transparent);
  color: var(--text);
}
.info-reveal {
  animation: infoIn 0.55s var(--ease-out, ease) both;
  animation-delay: var(--d, 0ms);
}
@keyframes infoIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
@media (min-width: 560px) {
  .info-actions { grid-template-columns: repeat(2, minmax(0, max-content)); }
}
@media (prefers-reduced-motion: reduce) {
  .info-reveal { animation: none; }
}
</style>
