import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const themeJs = readFileSync(join(root, 'resources/js/utils/theme.js'), 'utf8')
const themePhp = readFileSync(join(root, 'app/Support/Theme.php'), 'utf8')
const appBlade = readFileSync(join(root, 'resources/views/layouts/app.blade.php'), 'utf8')
const errorBlade = readFileSync(join(root, 'resources/views/layouts/error.blade.php'), 'utf8')
const appScss = readFileSync(join(root, 'resources/sass/app.scss'), 'utf8')
const memorisationCss = readFileSync(join(root, 'resources/js/views/Memorisation.css'), 'utf8')
const manifest = JSON.parse(readFileSync(join(root, 'public/manifest.webmanifest'), 'utf8'))

assert.match(themeJs, /export const DEFAULT_THEME = 'light'/)
assert.match(themePhp, /public const DEFAULT = 'light'/)
assert.match(themePhp, /public const DEFAULT_PREFERENCE = 'light-mode'/)
assert.match(themeJs, /export const THEME_MODES/)
assert.match(themeJs, /id: 'light'/)
assert.match(themeJs, /id: 'sepia'/)
assert.match(themeJs, /id: 'dark'/)
assert.match(themeJs, /THEME_CHOSEN_COOKIE_KEY/)
assert.match(themeJs, /mutqin_theme_set/)
assert.match(appBlade, /mutqin_theme_set=1/)
assert.match(themeJs, /\/api\/profile\/theme/)
assert.match(themeJs, /window\.mutqinAuthCheck/)
assert.match(themeJs, /themeStorageKeyForOwner/)
assert.match(themeJs, /isCurrentOwnerThemeStorageKey/)
assert.match(themeJs, /themeColor:\s*'#8b5e3c'/)
assert.match(themeJs, /themeColor:\s*'#14110f'/)
assert.match(themeJs, /backgroundColor:\s*'#f6f3ee'/)
assert.match(themeJs, /backgroundColor:\s*'#14110f'/)
assert.match(themeJs, /applyThemeChrome\(normalizedTheme\)/)
assert.match(themeJs, /meta\[name="theme-color"\]/)
assert.match(themeJs, /OS cannot switch it with data-theme/)

assert.match(appBlade, /Theme::DEFAULT_PREFERENCE/)
assert.match(appBlade, /persistThemeToServer/)
assert.match(appBlade, /\/api\/profile\/theme/)
assert.match(appBlade, /window\.mutqinAuthCheck/)
assert.match(appBlade, /mutqin-theme\.\$\{/)
assert.match(appBlade, /mutqin-theme\.guest/)
assert.match(appBlade, /window\.mutqinThemeModes/)
assert.match(appBlade, /globalThemeMenu/)
assert.match(appBlade, /data-theme-id/)
assert.match(appBlade, /\$appThemeColor = \$appThemeChrome\['theme_color'\]/)
assert.match(appBlade, /<meta name="theme-color" content="\{\{ \$appThemeColor \}\}">/)
assert.match(appBlade, /<meta name="color-scheme" content="\{\{ \$appColorScheme \}\}">/)
assert.doesNotMatch(appBlade, /theme-color" content="#8b5e3c" media="\(prefers-color-scheme/)
assert.doesNotMatch(appBlade, /function cycleTheme\(/)
assert.match(appBlade, /mode\.themeColor/)
assert.match(appBlade, /--bg:\s*#f6f3ee/)
assert.match(appBlade, /--bg:\s*#14110f/)

assert.match(errorBlade, /Theme::DEFAULT_PREFERENCE/)
assert.match(errorBlade, /\$appThemeColor = \$appThemeChrome\['theme_color'\]/)
assert.match(errorBlade, /<meta name="theme-color" content="\{\{ \$appThemeColor \}\}">/)
assert.doesNotMatch(errorBlade, /prefers-color-scheme/)

assert.match(appScss, /:root \{[\s\S]*?color-scheme:\s*light/)
assert.match(appScss, /html\[data-theme="dark"\] \{[\s\S]*?color-scheme:\s*dark/)
assert.match(appScss, /html\[data-theme="dark"\] \{[\s\S]*?--bg:\s*#14110f/)
assert.match(appScss, /html\.mutqin-pwa-standalone[\s\S]*?background:\s*var\(--bg\)/)

assert.match(memorisationCss, /\[data-theme="dark"\] \{[\s\S]*?--bg:\s*#14110f/)
assert.match(
  memorisationCss,
  /\[data-theme="dark"\] \{[\s\S]*?--workspace-card-surface:\s*var\(--workspace-card-surface-dark\)/,
)
assert.match(
  memorisationCss,
  /\[data-theme="dark"\] \{[\s\S]*?--zone-chrome-cream:\s*var\(--zone-chrome\)/,
)
assert.match(
  memorisationCss,
  /\[data-theme="sepia"\] \{[\s\S]*?--mushaf-reading-surface:\s*var\(--zone-chrome\)/,
)
assert.match(
  memorisationCss,
  /\[data-theme="sepia"\] \{[\s\S]*?--toolbar-control-fg:\s*#352516/,
)
assert.match(
  memorisationCss,
  /\.main\.mushaf-mode-active \.mushaf-page--madani \{[\s\S]*?color:\s*var\(--mushaf-reading-ink\)/,
)
assert.doesNotMatch(
  memorisationCss,
  /\.main\.mushaf-mode-active \.madani-surah-name \{[\s\S]*?color:\s*#18181b/,
)
assert.match(
  memorisationCss,
  /html\[data-theme="dark"\] body\.memorisation-page nav\.navbar\.app-navbar[\s\S]*?var\(--bg/,
)
assert.match(appBlade, /\.app-navbar \.navbar-toggler \{[\s\S]*?appearance:\s*none/)
assert.match(appBlade, /\.app-navbar \.navbar-toggler \{[\s\S]*?background:\s*transparent/)
assert.doesNotMatch(appBlade, /\.navbar-toggler \{[\s\S]*?isolation:\s*isolate/)
assert.doesNotMatch(appBlade, /html\[data-theme="dark"\] \.app-navbar,\s*\[data-theme="dark"\] \.app-navbar \{\s*background:\s*#000000/)
assert.doesNotMatch(appScss, /--bs-offcanvas-bg:\s*#000000/)

assert.match(
  appBlade,
  /\.profile-choice\[aria-checked="true"\][\s\S]*?background:\s*var\(--accent\)/,
)
assert.match(
  appBlade,
  /\.profile-choice\.is-selected[\s\S]*?color:\s*var\(--text-on-accent\)/,
)
assert.doesNotMatch(appBlade, /\.profile-choice-grid--pair/)
assert.doesNotMatch(
  appBlade,
  /\.profile-card--password \.profile-signin-methods \{\s*margin-top:\s*auto/,
)

assert.equal(manifest.theme_color, '#8b5e3c')
assert.equal(manifest.background_color, '#f6f3ee')
