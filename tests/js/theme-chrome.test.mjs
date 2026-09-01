import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const themeJs = readFileSync(join(root, 'resources/js/utils/theme.js'), 'utf8')
const appBlade = readFileSync(join(root, 'resources/views/layouts/app.blade.php'), 'utf8')
const errorBlade = readFileSync(join(root, 'resources/views/layouts/error.blade.php'), 'utf8')
const appScss = readFileSync(join(root, 'resources/sass/app.scss'), 'utf8')
const memorisationCss = readFileSync(join(root, 'resources/js/views/Memorisation.css'), 'utf8')
const manifest = JSON.parse(readFileSync(join(root, 'public/manifest.webmanifest'), 'utf8'))

assert.match(themeJs, /export const DEFAULT_THEME = 'sepia'/)
assert.match(themeJs, /persistThemeToServer/)
assert.match(themeJs, /\/api\/profile\/theme/)
assert.match(themeJs, /window\.mutqinAuthCheck/)
assert.match(themeJs, /themeColor:\s*'#8b5e3c'/)
assert.match(themeJs, /themeColor:\s*'#14110f'/)
assert.match(themeJs, /backgroundColor:\s*'#f6f3ee'/)
assert.match(themeJs, /backgroundColor:\s*'#14110f'/)
assert.match(themeJs, /applyThemeChrome\(normalizedTheme\)/)
assert.match(themeJs, /meta\[name="theme-color"\]/)
assert.match(themeJs, /OS cannot switch it with data-theme/)

assert.match(appBlade, /\$appThemePreference = \$appThemePreference \?\? session\('mutqin_theme', 'sepia-mode'\)/)
assert.match(appBlade, /persistThemeToServer/)
assert.match(appBlade, /\/api\/profile\/theme/)
assert.match(appBlade, /window\.mutqinAuthCheck/)
assert.match(appBlade, /\$appThemeColor = \$appTheme === 'dark' \? '#14110f' : '#8b5e3c'/)
assert.match(appBlade, /<meta name="theme-color" content="\{\{ \$appThemeColor \}\}">/)
assert.match(appBlade, /<meta name="color-scheme" content="\{\{ \$appColorScheme \}\}">/)
assert.doesNotMatch(appBlade, /theme-color" content="#8b5e3c" media="\(prefers-color-scheme/)
assert.match(appBlade, /normalizedTheme === 'dark' \? '#14110f' : '#8b5e3c'/)
assert.match(appBlade, /--bg:\s*#f6f3ee/)
assert.match(appBlade, /--bg:\s*#14110f/)

assert.match(errorBlade, /session\('mutqin_theme', 'sepia-mode'\)/)
assert.match(errorBlade, /\$appThemeColor = \$appTheme === 'dark' \? '#14110f' : '#8b5e3c'/)
assert.match(errorBlade, /<meta name="theme-color" content="\{\{ \$appThemeColor \}\}">/)
assert.doesNotMatch(errorBlade, /prefers-color-scheme/)

assert.match(appScss, /:root \{[\s\S]*?color-scheme:\s*light/)
assert.match(appScss, /html\[data-theme="dark"\] \{[\s\S]*?color-scheme:\s*dark/)
assert.match(appScss, /html\[data-theme="dark"\] \{[\s\S]*?--bg:\s*#14110f/)
assert.match(appScss, /html\.mutqin-pwa-standalone[\s\S]*?background:\s*var\(--bg\)/)

assert.match(memorisationCss, /\[data-theme="dark"\] \{[\s\S]*?--bg:\s*#14110f/)
assert.match(
  memorisationCss,
  /html\[data-theme="dark"\] body\.memorisation-page nav\.navbar\.app-navbar[\s\S]*?var\(--bg/,
)

assert.equal(manifest.theme_color, '#8b5e3c')
assert.equal(manifest.background_color, '#f6f3ee')
