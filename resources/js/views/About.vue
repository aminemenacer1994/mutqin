<template>
  <div class="page">

    <section class="hero">
      <span class="tag">{{ t('about.tag') }}</span>

      <h1>{{ t('about.heroTitle') }}</h1>

      <p>{{ t('about.heroDesc') }}</p>

      <div class="cta">
        <button class="primary">{{ t('about.ctaPrimary') }}</button>
        <button class="secondary">{{ t('about.ctaSecondary') }}</button>
      </div>
    </section>

    <section class="grid">

      <div class="card">
        <h3>{{ t('about.purposeTitle') }}</h3>
        <p>{{ t('about.purposeDesc') }}</p>
      </div>

      <div class="card">
        <h3>{{ t('about.approachTitle') }}</h3>
        <p>{{ t('about.approachDesc') }}</p>
      </div>

      <div class="card highlight">
        <h3>{{ t('about.outcomeTitle') }}</h3>
        <p>{{ t('about.outcomeDesc') }}</p>
      </div>

    </section>

    <section class="verse">{{ t('about.verse') }}</section>

  </div>
</template>

<script>
export default {
  name: 'AboutPage',
}
</script>

<style scoped>
.page{
  width:min(100%, 1100px);
  margin:auto;
  min-height:100dvh;
  padding:clamp(34px, 6vw, 64px) clamp(16px, 4vw, 24px);
  color:var(--text, #1f1a17);
  background:transparent;
  overflow-x:clip;
}

/* HERO */
.hero{
  text-align:center;
  margin-bottom:48px;
}

.tag{
  display:inline-block;
  padding:6px 12px;
  border-radius:999px;
  background:var(--accent-light);
  color:var(--accent-strong);
  font-size:12px;
  margin-bottom:16px;
}

.hero h1{
  font-size:clamp(34px, 7vw, 46px);
  line-height:1.1;
  letter-spacing:0;
  margin-bottom:16px;
  overflow-wrap:anywhere;
}

.hero p{
  max-width:650px;
  margin:auto;
  color:var(--text-muted, #6c6258);
  line-height:1.7;
}

/* CTA */
.cta{
  margin-top:25px;
  display:grid;
  grid-template-columns:repeat(auto-fit, minmax(min(100%, 220px), 1fr));
  gap:12px;
}

button{
  width:100%;
  min-width:44px;
  min-height:44px;
  padding:12px 18px;
  border-radius:8px;
  border:none;
  cursor:pointer;
  transition:0.2s ease;
  overflow-wrap:anywhere;
}

.primary{
  background:var(--accent);
  color:var(--text-on-accent, #fffaf5);
  font-weight:600;
}

.secondary{
  background:var(--surface);
  color:var(--text);
  border:1px solid var(--border);
}

/* GRID */
.grid{
  display:grid;
  grid-template-columns:repeat(auto-fit,minmax(min(100%, 220px),1fr));
  gap:16px;
  margin-top:28px;
}

.card{
  padding:18px;
  min-width:0;
  border-radius:16px;
  background:color-mix(in srgb, var(--surface-strong, #fff) 92%, var(--surface-elevated, #fffaf4));
  border:1px solid color-mix(in srgb, var(--accent, #a0784c) 12%, var(--border, rgba(160, 120, 76, 0.12)));
  backdrop-filter:blur(12px);
  transition:0.25s ease;
  box-shadow:var(--shadow-sm, 0 8px 24px rgba(0,0,0,0.06));
}

.card:hover{
  transform:translateY(-6px);
  border-color:color-mix(in srgb, var(--accent, #a0784c) 34%, var(--border, rgba(160, 120, 76, 0.12)));
}

.highlight{
  border-color:color-mix(in srgb, var(--accent, #a0784c) 44%, var(--border, rgba(160, 120, 76, 0.12)));
}

.verse{
  text-align:center;
  margin-top:40px;
  color:var(--text-muted, #6c6258);
  font-style:italic;
}

html[dir="rtl"] .hero,
html[dir="rtl"] .verse {
  text-align: center;
}

</style>
