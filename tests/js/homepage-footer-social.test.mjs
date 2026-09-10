import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const homepage = readFileSync(join(root, 'resources/js/views/Homepage.vue'), 'utf8')
const css = readFileSync(join(root, 'resources/js/views/Homepage.css'), 'utf8')
const en = JSON.parse(readFileSync(join(root, 'resources/js/locales/en.json'), 'utf8'))

assert.match(homepage, /class="footer__social"/)
assert.match(homepage, /homepage\.footer\.connect/)
assert.match(homepage, /bi-instagram/)
assert.match(homepage, /bi-facebook/)
assert.match(homepage, /bi-twitter-x/)
assert.match(homepage, /bi-linkedin/)
assert.match(homepage, /bi-tiktok/)
assert.match(homepage, /rel="noopener noreferrer"/)
assert.match(homepage, /https:\/\/www\.instagram\.com\/mutqinai\//)
assert.match(homepage, /class="footer__copy"/)

assert.match(css, /\.footer__social-link \{/)
assert.match(css, /justify-self: end/)
assert.match(css, /width: 2rem/)
assert.match(css, /gap: 0\.75rem/)

const social = en.homepage.footer.social
assert.equal(social.instagram, 'Instagram')
assert.equal(social.facebook, 'Facebook')
assert.equal(social.x, 'X')
assert.equal(social.linkedin, 'LinkedIn')
assert.equal(social.tiktok, 'TikTok')

console.log('homepage-footer-social.test.mjs: ok')
