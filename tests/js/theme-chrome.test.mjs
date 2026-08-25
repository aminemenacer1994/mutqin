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

assert.match(themeJs, /themeColor:\s*'#0F7A5C'/)
assert.match(themeJs, /themeColor:\s*'#12324A'/)
assert.match(themeJs, /backgroundColor:\s*'#F3F5F7'/)
assert.match(themeJs, /backgroundColor:\s*'#12324A'/)
assert.match(themeJs, /applyThemeChrome\(normalizedTheme\)/)
assert.match(themeJs, /meta\[name="theme-color"\]/)
assert.match(themeJs, /OS cannot switch it with data-theme/)

assert.match(appBlade, /\$appThemeColor = \$appTheme === 'dark' \? '#12324A' : '#0F7A5C'/)
assert.match(appBlade, /<meta name="theme-color" content="\{\{ \$appThemeColor \}\}">/)
assert.match(appBlade, /<meta name="color-scheme" content="\{\{ \$appColorScheme \}\}">/)
assert.doesNotMatch(appBlade, /theme-color" content="#0F7A5C" media="\(prefers-color-scheme/)
assert.match(appBlade, /normalizedTheme === 'dark' \? '#12324A' : '#0F7A5C'/)
assert.match(appBlade, /--bg:\s*#f3f5f7/)
assert.match(appBlade, /--bg:\s*#12324a/)

assert.match(errorBlade, /\$appThemeColor = \$appTheme === 'dark' \? '#12324A' : '#0F7A5C'/)
assert.match(errorBlade, /<meta name="theme-color" content="\{\{ \$appThemeColor \}\}">/)
assert.doesNotMatch(errorBlade, /prefers-color-scheme/)

assert.match(appScss, /:root \{[\s\S]*?color-scheme:\s*light/)
assert.match(appScss, /html\[data-theme="dark"\] \{[\s\S]*?color-scheme:\s*dark/)
assert.match(appScss, /html\[data-theme="dark"\] \{[\s\S]*?--bg:\s*#12324a/)
assert.match(appScss, /html\.mutqin-pwa-standalone[\s\S]*?background:\s*var\(--bg\)/)
assert.match(appScss, /--brand-emerald:\s*#0f7a5c/)
assert.match(appScss, /--brand-navy:\s*#12324a/)

assert.match(memorisationCss, /\[data-theme="dark"\] \{[\s\S]*?--bg:\s*#12324a/)
assert.match(memorisationCss, /\[data-theme="dark"\] \{[\s\S]*?--accent:\s*#4ec798/)
assert.match(
  memorisationCss,
  /html\[data-theme="dark"\] body\.memorisation-page nav\.navbar\.app-navbar[\s\S]*?var\(--bg/,
)

assert.equal(manifest.theme_color, '#0F7A5C')
assert.equal(manifest.background_color, '#F3F5F7')
