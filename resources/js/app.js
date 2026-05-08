require('./bootstrap.js');

import { createApp } from 'vue';
import Homepage from './components/Homepage.vue';
import Memorisation from './components/Memorisation.vue';

const app = createApp({});

app.component('homepage', Homepage);
app.component('memorisation', Memorisation);

app.mount('#app');

// Global theme (light/sepia/dark) applied across all pages.
(() => {
  const THEMES = ['light', 'sepia', 'dark']
  const key = 'telawa.globalTheme'
  const root = document.documentElement

  function apply(theme) {
    root.setAttribute('data-theme', theme)
    try { localStorage.setItem(key, theme) } catch (e) {}
    const btn = document.getElementById('globalThemeToggle')
    if (btn) {
      const icon = btn.querySelector('i')
      if (icon) {
        icon.className = theme === 'dark' ? 'bi bi-moon-stars' : theme === 'sepia' ? 'bi bi-droplet-half' : 'bi bi-sun'
      }
    }
  }

  let theme = 'light'
  try {
    const stored = localStorage.getItem(key)
    if (stored && THEMES.includes(stored)) theme = stored
  } catch (e) {}
  apply(theme)

  const btn = document.getElementById('globalThemeToggle')
  if (btn) {
    btn.addEventListener('click', () => {
      const current = root.getAttribute('data-theme') || 'light'
      const idx = THEMES.indexOf(current)
      apply(THEMES[(idx + 1) % THEMES.length])
    })
  }
})();
