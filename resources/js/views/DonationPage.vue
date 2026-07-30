<template>
  <section class="info-page support-page">
    <div class="info-shell">
      <header class="info-header info-reveal">
        <span class="info-kicker"><i class="bi bi-life-preserver" aria-hidden="true"></i> Support</span>
        <h1>Support</h1>
        <p>
          Help with getting started, your account, memorisation sessions, and recitation checks —
          or contact us if something still feels unclear.
        </p>
      </header>

      <section class="info-section info-reveal" style="--d: 40ms">
        <div class="info-icon" aria-hidden="true"><i class="bi bi-play-circle"></i></div>
        <h2>Getting started</h2>
        <p>Open Memorisation, choose a short range, and begin with listen-and-repeat.</p>
        <a class="info-inline-link" href="/memorisation">Go to Memorisation</a>
      </section>

      <section class="info-section info-reveal" style="--d: 80ms">
        <div class="info-icon" aria-hidden="true"><i class="bi bi-person"></i></div>
        <h2>Account help</h2>
        <p>Sign in to keep sessions synced. Use the password reset link if you cannot access your account.</p>
        <a class="info-inline-link" href="/login">Sign in</a>
      </section>

      <section class="info-section info-reveal" style="--d: 120ms">
        <div class="info-icon" aria-hidden="true"><i class="bi bi-journal-bookmark"></i></div>
        <h2>Memorisation session help</h2>
        <p>Use guided practice to listen, follow, and repeat. After a session, follow the suggested next step.</p>
      </section>

      <section class="info-section info-reveal" style="--d: 160ms">
        <div class="info-icon" aria-hidden="true"><i class="bi bi-mic"></i></div>
        <h2>Recitation feature help</h2>
        <p>
          Check my memorisation lets you recite while Mutqin follows along.
          It is a beta practice aid and does not replace a teacher.
        </p>
      </section>

      <section class="info-section info-reveal" style="--d: 200ms">
        <div class="info-icon" aria-hidden="true"><i class="bi bi-wrench"></i></div>
        <h2>Technical support</h2>
        <p>If audio or login fails, refresh once, then sign out and back in. Allow microphone access for recitation checks.</p>
      </section>

      <section class="info-section info-reveal" style="--d: 240ms">
        <div class="info-icon" aria-hidden="true"><i class="bi bi-chat-heart"></i></div>
        <h2>Feedback and contact</h2>
        <p>Share what worked, what felt confusing, or how we can support your memorisation better.</p>
      </section>

      <div class="info-actions info-reveal" style="--d: 280ms">
        <a class="info-btn info-btn--primary" href="/#contact">Contact us</a>
        <a class="info-btn info-btn--ghost" href="/donate">Support the project</a>
      </div>
    </div>
  </section>
</template>

<script>
export default { name: 'DonationPage' };
</script>

<style scoped>
.info-page {
  padding: calc(var(--nav-h, 70px) + clamp(1.1rem, 3vw, 1.75rem)) 0 clamp(2.25rem, 5vw, 3.5rem);
}
.info-shell {
  width: min(40rem, calc(100% - clamp(1.5rem, 5vw, 2.5rem)));
  margin: 0 auto;
  display: grid;
  gap: clamp(1rem, 2.6vw, 1.4rem);
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
  padding-top: 0.9rem;
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
.info-inline-link {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  margin-top: 0.25rem;
  color: var(--accent-strong);
  font-weight: 600;
  text-decoration: none;
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
