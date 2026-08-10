<template>
  <section class="info-page">
    <div class="info-shell">
      <header class="info-header info-reveal">
        <div class="info-header-copy">
          <span class="info-kicker"><i class="bi bi-book-half" aria-hidden="true"></i> About</span>
          <h1>About Mutqin</h1>
          <ul class="info-highlights" aria-label="What Mutqin offers">
            <li><i class="bi bi-earbuds" aria-hidden="true"></i> Listen</li>
            <li><i class="bi bi-mic" aria-hidden="true"></i> Repeat</li>
            <li><i class="bi bi-signpost-2" aria-hidden="true"></i> Next step</li>
          </ul>
        </div>
        <div class="info-header-aside">
          <p>
            Mutqin helps you memorise the Qur’an through daily practice.
            Listen, repeat, and always know what to do next.
          </p>
          <div class="info-actions">
            <a class="info-btn info-btn--primary" href="/memorisation">
              <i class="bi bi-play-fill" aria-hidden="true"></i> Start practising
            </a>
          </div>
        </div>
      </header>

      <div class="info-sections">
        <section class="info-section info-reveal" style="--d: 60ms">
          <div class="info-section-head">
            <div class="info-icon" aria-hidden="true"><i class="bi bi-signpost-2"></i></div>
            <h2>Know what to practise next</h2>
          </div>
          <p>
            It is easy to practise well today and forget what to revise tomorrow.
            Mutqin keeps the next step clear so coming back each day is simple.
          </p>
        </section>

        <section class="info-section info-reveal" style="--d: 120ms">
          <div class="info-section-head">
            <div class="info-icon" aria-hidden="true"><i class="bi bi-earbuds"></i></div>
            <h2>Listen, then repeat</h2>
          </div>
          <p>
            Play the ayah, follow along, and repeat at your own pace.
            When you finish, Mutqin suggests what to do next.
          </p>
        </section>

        <section class="info-section info-reveal" style="--d: 180ms">
          <div class="info-section-head">
            <div class="info-icon" aria-hidden="true"><i class="bi bi-person-heart"></i></div>
            <h2>A helper, not a teacher</h2>
          </div>
          <p>
            Mutqin helps you stay consistent. It does not replace a qualified teacher.
            Accuracy and respect for the Qur’an come first.
          </p>
        </section>
      </div>

      <div class="info-actions info-reveal" style="--d: 240ms">
        <a class="info-btn info-btn--primary" href="/memorisation">
          <i class="bi bi-play-fill" aria-hidden="true"></i> Start practising
        </a>
      </div>
    </div>
  </section>
</template>

<script>
export default { name: 'AboutUsPage' };
</script>
