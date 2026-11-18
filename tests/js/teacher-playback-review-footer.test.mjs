import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const dashboardCss = readFileSync(join(root, 'resources/js/views/TeacherDashboard.css'), 'utf8')
const workspaceCss = readFileSync(join(root, 'resources/js/styles/workspace-modern.css'), 'utf8')

const longArabic = 'ٱلرَّحْمَٰنِ ٱلرَّحِيمِ مَٰلِكِ يَوْمِ ٱلدِّينِ إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ'.repeat(3)
const mushaf = Array.from({ length: 48 }, (_, index) => `<span class="teacher-recite-mushaf__word" lang="ar">ٱلْحَمْدُ${index + 1}</span>`).join('')

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <style>
      ${dashboardCss}
      ${workspaceCss}
      html, body { margin: 0; height: 100%; }
      *, *::before, *::after { box-sizing: border-box; }
      :root {
        --teacher-line: #e4ddd4;
        --teacher-line-strong: #cfc6bc;
        --teacher-surface: #fff;
        --teacher-surface-soft: #f7f4ef;
        --teacher-surface-hover: #f3eee8;
        --teacher-text: #241c16;
        --teacher-text-soft: #6d645b;
        --teacher-positive: #1f7a4d;
        --teacher-positive-soft: #e7f6ee;
        --teacher-warning: #9a6700;
        --teacher-warning-soft: #fff4e0;
        --teacher-danger: #a33b32;
        --teacher-danger-soft: #fdeceb;
        --teacher-accent-ink: #6b4a32;
        --teacher-accent-soft: #f3ebe3;
        --accent: #8b5e3c;
        --accent-strong: #6b4a32;
        --teacher-radius-sm: 8px;
        --radius-dialog: 16px;
        --font-ar: "Geeza Pro", "Noto Naskh Arabic", serif;
        --workspace-surface: #fff;
        --workspace-line: #e4ddd4;
        --workspace-ink: #241c16;
        --border: #e4ddd4;
        --surface-strong: #fff;
        --text: #241c16;
      }
      .teacher-dialog.modal { position: fixed; inset: 0; }
      .teacher-playback-studio .modal-dialog { width: min(1240px, 100%); }
      button, input, select, textarea { font: inherit; }
    </style>
  </head>
  <body>
    <div class="modal fade show d-block teacher-dialog teacher-playback-studio" role="dialog">
      <div class="modal-dialog modal-dialog-centered modal-xl">
        <div class="modal-content">
          <div class="modal-header teacher-dialog__header is-inline">
            <h2 class="modal-title">Amina</h2>
            <div class="teacher-dialog__pills"><span class="teacher-playback__crumb">Al-Baqarah 1–8</span></div>
            <button type="button" class="btn-close" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div class="teacher-playback">
              <div class="teacher-playback__layout">
                <div class="teacher-playback__main">
                  <div class="teacher-playback__stage">
                    <div class="teacher-playback__player">
                      <div class="teacher-playback__transport">
                        <button type="button" class="teacher-playback__play" aria-label="Play">▶</button>
                        <div class="teacher-playback__seek"><input type="range" aria-label="Position" value="0"></div>
                      </div>
                    </div>
                  </div>
                  <div class="teacher-playback__mushaf">
                    <div class="teacher-recite-mushaf is-lines" lang="ar" dir="rtl">${mushaf}</div>
                  </div>
                </div>
                <aside class="teacher-playback__side">
                  <section class="teacher-playback__section teacher-playback__ai">
                    <h2>Wording match</h2>
                    <p class="teacher-playback__score">82%</p>
                    <p class="teacher-playback__hint">These colours are a wording check. They are not a Tajweed or pronunciation score.</p>
                    <div class="teacher-playback__summary">
                      <dl class="teacher-playback__summary-counts">
                        <div class="is-correct"><dt>Matched</dt><dd>40</dd></div>
                        <div class="is-uncertain"><dt>Uncertain</dt><dd>2</dd></div>
                        <div class="is-flagged"><dt>Flagged</dt><dd>3</dd></div>
                        <div class="is-skipped"><dt>Skipped</dt><dd>1</dd></div>
                      </dl>
                    </div>
                    <div class="teacher-playback__follow">
                      <h3>Needs attention</h3>
                      <ul class="teacher-playback__words">
                        <li><button type="button"><span class="teacher-playback__arabic" lang="ar" dir="rtl">${longArabic}</span><small>Flagged</small></button></li>
                      </ul>
                    </div>
                  </section>
                  <section class="teacher-playback__section teacher-playback__assessment">
                    <h2>Your assessment</h2>
                    <p class="teacher-playback__hint">These notes are yours. They do not change the checker's wording flags.</p>
                    <div class="teacher-playback__ratings">
                      <label class="teacher-playback__rating"><span>Memorisation</span><select class="form-select"><option>No rating</option></select></label>
                      <label class="teacher-playback__rating"><span>Tajweed</span><select class="form-select"><option>No rating</option></select></label>
                      <label class="teacher-playback__rating"><span>Pronunciation</span><select class="form-select"><option>No rating</option></select></label>
                      <label class="teacher-playback__rating"><span>Fluency</span><select class="form-select"><option>No rating</option></select></label>
                    </div>
                    <label class="teacher-playback__field"><span>General feedback</span><textarea class="form-control" rows="2">Keep the madd clear.</textarea></label>
                    <button type="button" class="btn btn-primary btn-sm">Save assessment</button>
                    <div class="teacher-playback__word">
                      <h3>Selected word</h3>
                      <p class="teacher-playback__glyph" lang="ar" dir="rtl">${longArabic}</p>
                      <p class="teacher-playback__ai-result">AI result: Flagged</p>
                      <label class="teacher-playback__field"><span>Written correction</span><textarea id="word-note" rows="2">unsaved correction</textarea></label>
                      <div class="teacher-playback__action-row">
                        <button type="button" class="btn btn-primary btn-sm">Send correction</button>
                      </div>
                      <details class="teacher-playback__panel">
                        <summary>Review actions</summary>
                        <label class="teacher-playback__field"><span>Due date</span><input id="word-due" type="date" value="2026-11-25"></label>
                      </details>
                    </div>
                  </section>
                  <section class="teacher-playback__section teacher-playback__response">
                    <h2>Written feedback</h2>
                    <p class="teacher-playback__hint">Optional. Sending feedback does not complete the review.</p>
                    <label class="teacher-playback__field"><span class="visually-hidden">Written feedback</span><textarea id="feedback-note" rows="2">Practise the ayah slowly.</textarea></label>
                    <div class="teacher-playback__action-row">
                      <button type="button" class="btn btn-outline-secondary btn-sm" id="send-feedback">Send feedback</button>
                    </div>
                  </section>
                  <section class="teacher-playback__section teacher-playback__revision">
                    <h2>Revision and follow-up</h2>
                    <p class="teacher-playback__hint">Optional. Assigning a revision does not complete the review.</p>
                    <label class="teacher-playback__field"><span>Due date</span><input id="revision-due" type="date" value="2026-11-30"></label>
                    <label class="teacher-playback__field"><span>Note for the student</span><textarea id="revision-note" rows="2">Repeat the flagged words.</textarea></label>
                    <button type="button" class="btn btn-outline-secondary btn-sm" id="assign-revision">Assign revision</button>
                  </section>
                </aside>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <div class="teacher-playback__review-status">
              <p class="teacher-playback__review-copy"><strong>Awaiting review</strong></p>
              <div class="teacher-playback__review-actions">
                <button type="button" class="btn btn-outline-secondary" id="review-next">Next</button>
                <button type="button" class="btn btn-primary teacher-playback__mark" id="review-complete">Complete review</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </body>
</html>`

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()
const viewports = [
  { width: 1280, height: 640, name: 'short laptop' },
  { width: 1024, height: 768, name: 'tablet landscape' },
  { width: 768, height: 1024, name: 'tablet' },
  { width: 640, height: 360, name: 'desktop at 200% zoom' },
  { width: 390, height: 700, name: 'mobile' },
]

try {
  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await page.setContent(html, { waitUntil: 'domcontentloaded' })
    const report = await page.evaluate(() => {
      const body = document.querySelector('.modal-body')
      const content = document.querySelector('.modal-content')
      const side = document.querySelector('.teacher-playback__side')
      const footer = document.querySelector('.modal-footer')
      const controls = [...document.querySelectorAll('.teacher-playback button, .teacher-playback input, .teacher-playback textarea, .teacher-playback select, .teacher-playback summary')]
      const positions = [0, Math.floor(body.scrollHeight / 2), body.scrollHeight]
      const hits = []
      for (const top of positions) {
        body.scrollTop = top
        const footerBox = footer.getBoundingClientRect()
        const bodyBox = body.getBoundingClientRect()
        for (const el of controls) {
          const style = getComputedStyle(el)
          if (style.display === 'none' || style.visibility === 'hidden') continue
          const rect = el.getBoundingClientRect()
          const visibleTop = Math.max(rect.top, bodyBox.top)
          const visibleBottom = Math.min(rect.bottom, bodyBox.bottom)
          const visibleLeft = Math.max(rect.left, bodyBox.left)
          const visibleRight = Math.min(rect.right, bodyBox.right)
          if (visibleBottom - visibleTop < 1 || visibleRight - visibleLeft < 1) continue
          if (visibleBottom > footerBox.top + 1 && visibleTop < footerBox.bottom - 1) {
            hits.push((el.id || el.textContent || el.tagName).trim().slice(0, 40))
          }
        }
      }
      body.scrollTop = body.scrollHeight
      const assign = document.querySelector('#assign-revision').getBoundingClientRect()
      const footerBox = footer.getBoundingClientRect()
      const next = document.querySelector('#review-next').getBoundingClientRect()
      const complete = document.querySelector('#review-complete').getBoundingClientRect()
      const glyph = document.querySelector('.teacher-playback__glyph').getBoundingClientRect()
      const sideBox = side.getBoundingClientRect()
      const mushaf = document.querySelector('.teacher-playback__mushaf')
      return {
        hits,
        bodyScrolls: body.scrollHeight > body.clientHeight + 1,
        contentScroll: content.scrollHeight - content.clientHeight,
        horizontal: body.scrollWidth - body.clientWidth,
        sideOverflow: getComputedStyle(side).overflowY,
        assignAboveFooter: assign.bottom <= footerBox.top + 1,
        assignVisible: assign.height > 0 && assign.top < footerBox.top,
        nextVisible: next.top >= footerBox.top - 1 && next.bottom <= footerBox.bottom + 1 && next.width > 0,
        completeVisible: complete.top >= footerBox.top - 1 && complete.bottom <= footerBox.bottom + 1 && complete.width > 0,
        glyphInside: glyph.right <= sideBox.right + 1 && glyph.left >= sideBox.left - 1,
        mushafHorizontal: mushaf.scrollWidth - mushaf.clientWidth,
        mushafVisible: mushaf.getBoundingClientRect().height >= 150,
        wordNote: document.querySelector('#word-note').value,
        feedbackNote: document.querySelector('#feedback-note').value,
        revisionNote: document.querySelector('#revision-note').value,
      }
    })
    assert.deepEqual(report.hits, [], `${viewport.name}: a control overlaps the footer`)
    assert.equal(report.bodyScrolls, true, `${viewport.name}: the modal body scrolls`)
    assert.ok(report.contentScroll <= 2, `${viewport.name}: the dialog shell does not scroll`)
    assert.ok(report.horizontal <= 1, `${viewport.name}: no horizontal overflow`)
    assert.equal(['visible', 'clip'].includes(report.sideOverflow), true, `${viewport.name}: coaching is not a nested scroller (${report.sideOverflow})`)
    assert.equal(report.assignAboveFooter, true, `${viewport.name}: Assign revision stays above the footer`)
    assert.equal(report.assignVisible, true, `${viewport.name}: Assign revision is reachable`)
    assert.equal(report.nextVisible, true, `${viewport.name}: Next stays in the footer`)
    assert.equal(report.completeVisible, true, `${viewport.name}: Complete review stays in the footer`)
    assert.equal(report.glyphInside, true, `${viewport.name}: long Arabic stays inside the coaching column`)
    assert.ok(report.mushafHorizontal <= 1, `${viewport.name}: Arabic passage has no horizontal overflow`)
    assert.equal(report.mushafVisible, true, `${viewport.name}: the Qur'an panel keeps usable reading space`)
    assert.equal(report.wordNote, 'unsaved correction')
    assert.equal(report.feedbackNote, 'Practise the ayah slowly.')
    assert.equal(report.revisionNote, 'Repeat the flagged words.')

    await page.locator('summary').click()
    const kept = await page.evaluate(() => ({
      due: document.querySelector('#word-due').value,
      note: document.querySelector('#word-note').value,
      feedback: document.querySelector('#feedback-note').value,
    }))
    assert.equal(kept.due, '2026-11-25', `${viewport.name}: expanding a section keeps the due date`)
    assert.equal(kept.note, 'unsaved correction', `${viewport.name}: expanding a section keeps the correction`)
    assert.equal(kept.feedback, 'Practise the ayah slowly.', `${viewport.name}: expanding a section keeps feedback`)
  }
  console.log('teacher playback review footer ok')
} finally {
  await browser.close()
}
