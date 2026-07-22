import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const css = readFileSync(join(root, 'resources/js/views/Memorisation.css'), 'utf8')
const vue = readFileSync(join(root, 'resources/js/views/Memorisation.vue'), 'utf8')
const hifz = readFileSync(join(root, 'resources/js/components/HifzPlanCreatorModal.vue'), 'utf8')

function sliceVariant(name) {
  // Prefer the shared colour block (property includes color/background), not layout-only overrides.
  const re = new RegExp(
    `\\.mutqin-modal-btn--${name}(?:,\\s*\\.mutqin-modal-btn--[a-z]+)?\\s*\\{([\\s\\S]*?)\\n\\}`,
    'g'
  )
  let match
  let best = null
  while ((match = re.exec(css))) {
    const body = match[1]
    if (/background:|color:/.test(body)) {
      best = body
      break
    }
  }
  assert.ok(best, `expected .mutqin-modal-btn--${name} colour variant`)
  return best
}

// Shared semantic tokens exist — Bootstrap custom danger (#b55041), not plain #dc3545/#c0392b
{
  assert.match(css, /--accent:\s*#9a6738/)
  assert.match(css, /--success:\s*#2e7d64/)
  assert.match(css, /--bs-danger:\s*#b55041/)
  assert.match(css, /--danger:\s*#b55041/)
  assert.match(css, /--destructive:\s*var\(--danger\)/)
}

// Primary is gold/brown accent — not mixed with legacy mint green
{
  const primary = sliceVariant('primary')
  assert.match(primary, /var\(--accent\)/)
  assert.doesNotMatch(primary, /#58b68e|#2f6f58|#79d39e/)
  assert.match(css, /\.mutqin-modal-btn--primary:hover:not\(:disabled\)/)
  assert.match(css, /\.mutqin-modal-btn--primary:active:not\(:disabled\)/)
  assert.match(css, /\.mutqin-modal-btn--primary:focus-visible/)
}

// Success stays green for completed / verified / saved semantics
{
  const success = sliceVariant('success')
  assert.match(success, /var\(--success\)/)
  assert.match(css, /\.mutqin-modal-btn--success:hover:not\(:disabled\)/)
  assert.match(css, /\.mutqin-modal-btn--success:focus-visible/)
}

// Destructive / danger share Bootstrap custom danger red
{
  const danger = sliceVariant('danger')
  const destructive = sliceVariant('destructive')
  assert.match(danger, /var\(--bs-danger/)
  assert.match(destructive, /var\(--bs-danger/)
  assert.doesNotMatch(danger, /#dc3545|#e74c3c|#c0392b/)
  assert.match(css, /\.mutqin-modal-btn--destructive:hover:not\(:disabled\)/)
  assert.match(css, /\.mutqin-modal-btn--destructive:active:not\(:disabled\)/)
  assert.match(css, /\.mutqin-modal-btn--destructive:focus-visible/)
  assert.match(css, /\.mutqin-modal-btn:disabled/)
  assert.match(css, /\.mutqin-modal-btn\.is-loading/)
  assert.match(css, /\.mutqin-modal-btn\[aria-busy="true"\]/)
}

// Secondary remains neutral
{
  const secondary = sliceVariant('secondary')
  assert.match(secondary, /var\(--text\)/)
  assert.doesNotMatch(secondary, /#2f6f58|#58b68e|var\(--success\)|var\(--danger\)/)
}

// End Session trigger + confirm use destructive, not green
{
  assert.match(vue, /action-btn-exit mutqin-btn--destructive/)
  assert.match(vue, /mutqin-modal-btn--destructive session-exit-action-chip session-exit-action-chip--end/)
  assert.match(vue, /mutqin-modal-btn--secondary session-exit-action-chip/)
  assert.doesNotMatch(vue, /session-exit-action-chip--continue/)
  assert.match(css, /--danger:\s*#b55041/)
  assert.match(css, /--bs-danger:\s*#b55041/)
  const lock = css.slice(css.indexOf('Button colour semantics — final lock'))
  assert.match(lock, /--bs-danger|#b55041/)
  assert.doesNotMatch(lock.slice(0, 1200), /#c0392b|#e74c3c|#dc3545/)
}

// Dark-mode session primaries stay brand gold/brown
{
  const darkPrimary = css.match(
    /\[data-theme="dark"\] \.action-btn\.primary \{([^}]+)\}/
  )
  assert.ok(darkPrimary, 'expected dark .action-btn.primary rule')
  assert.doesNotMatch(darkPrimary[1], /#2f8b66|#74d99e|#2a6b52|#6fcea0/)
  assert.match(darkPrimary[1], /var\(--accent\)/)

  const darkSessionPrimary = css.match(
    /\[data-theme="dark"\][\s\S]{0,280}\.session-primary-action[\s\S]{0,180}?\{([^}]+)\}/
  )
  assert.ok(darkSessionPrimary, 'expected dark session-primary-action colour rule')
  assert.doesNotMatch(darkSessionPrimary[1], /#2a6b52|#6fcea0|#2f8b66/)
  assert.match(darkSessionPrimary[1], /var\(--accent\)/)
}

// Plan wizard Continue / save use primary, not Bootstrap success green
{
  assert.match(hifz, /class="btn btn-primary"/)
  assert.match(hifz, /class="btn btn-primary hifz-plan-save-btn"/)
  assert.doesNotMatch(hifz, /btn-success/)
  assert.match(hifz, /--plan-accent:\s*var\(--accent,\s*#9a6738\)/)
}

console.log('button-colour-semantics.test.mjs: all assertions passed')
