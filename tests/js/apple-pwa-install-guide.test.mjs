import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { getBrowserInfo } from '../../resources/js/scripts/browser/getBrowserInfo.js'

const root = dirname(fileURLToPath(import.meta.url))
const pwa = readFileSync(join(root, '../../resources/js/pwa.js'), 'utf8')
const blade = readFileSync(join(root, '../../resources/views/partials/ios-pwa-install.blade.php'), 'utf8')
const en = readFileSync(join(root, '../../lang/en/ui.php'), 'utf8')

assert.match(pwa, /import \{ getBrowserInfo \}/)
assert.match(pwa, /APPLE_INSTALL_BROWSERS/)
assert.match(pwa, /isAppleMacDesktop/)
assert.match(pwa, /shouldRegisterServiceWorker/)
assert.match(pwa, /selectAppleInstallBrowser/)
assert.match(pwa, /data-ios-pwa-browser/)

assert.match(blade, /data-ios-pwa-browser="\{\{ \$browserId \}\}"/)
assert.match(blade, /'safari' => __\('ui\.pwa_install_browser_safari'\)/)
assert.match(blade, /'chrome' => __\('ui\.pwa_install_browser_chrome'\)/)
assert.match(blade, /'edge' => __\('ui\.pwa_install_browser_edge'\)/)
assert.match(blade, /'firefox' => __\('ui\.pwa_install_browser_firefox'\)/)
assert.match(blade, /data-ios-pwa-panel="safari"/)
assert.match(blade, /data-ios-pwa-panel="chrome"/)
assert.match(blade, /data-ios-pwa-panel="edge"/)
assert.match(blade, /data-ios-pwa-panel="firefox"/)
assert.match(blade, /data-ios-pwa-steps="touch"/)
assert.match(blade, /data-ios-pwa-steps="mac"/)
assert.match(blade, /pwa_install_ios_chrome_1/)
assert.match(blade, /pwa_install_mac_safari_2/)

assert.match(en, /Install Mutqin on iPhone, iPad, or Mac/)
assert.match(en, /pwa_install_browsers_aria/)
assert.match(en, /pwa_install_mac_chrome_2/)

// Guide should detect non-Safari Apple browsers correctly.
assert.equal(getBrowserInfo({
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.0.0 Mobile/15E148 Safari/604.1',
}).browser, 'chrome')
assert.equal(getBrowserInfo({
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
}).browser, 'chrome')
assert.equal(getBrowserInfo({
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
}).browser, 'safari')

console.log('apple-pwa-install-guide: ok')
