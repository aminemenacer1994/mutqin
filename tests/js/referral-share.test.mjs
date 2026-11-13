import assert from 'node:assert/strict'
import test from 'node:test'
import {
  emailShareHref,
  whatsappShareHref,
} from '../../resources/js/scripts/referrals/referralShare.js'

test('whatsapp share encodes invite copy', () => {
  const href = whatsappShareHref('Join me on Mutqin', 'https://app.mutqin.ai/?ref=abc123xyz0')
  assert.ok(href.startsWith('https://wa.me/?text='))
  assert.ok(href.includes(encodeURIComponent('https://app.mutqin.ai/?ref=abc123xyz0')))
})

test('email share builds mailto with subject and body', () => {
  const href = emailShareHref({
    subject: 'Join me on Mutqin',
    body: 'Try Mutqin: https://app.mutqin.ai/?ref=abc123xyz0',
  })
  assert.ok(href.startsWith('mailto:?subject='))
  assert.ok(href.includes(encodeURIComponent('Join me on Mutqin')))
  assert.ok(href.includes(encodeURIComponent('https://app.mutqin.ai/?ref=abc123xyz0')))
})
