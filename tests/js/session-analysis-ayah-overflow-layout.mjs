import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const css = readFileSync(join(root, 'resources/js/components/SessionAnalysisOverview.css'), 'utf8')

const longAyah = [
  'ٱللَّهُ', 'لَا', 'إِلَٰهَ', 'إِلَّا', 'هُوَ', 'ٱلْحَىُّ', 'ٱلْقَيُّومُ',
  'لَا', 'تَأْخُذُهُۥ', 'سِنَةٌ', 'وَلَا', 'نَوْمٌ', 'لَّهُۥ', 'مَا', 'فِى',
  'ٱلسَّمَٰوَٰتِ', 'وَمَا', 'فِى', 'ٱلْأَرْضِ', 'مَن', 'ذَا', 'ٱلَّذِى',
  'يَشْفَعُ', 'عِندَهُۥٓ', 'إِلَّا', 'بِإِذْنِهِۦ', 'يَعْلَمُ', 'مَا', 'بَيْنَ',
  'أَيْدِيهِمْ', 'وَمَا', 'خَلْفَهُمْ', 'وَلَا', 'يُحِيطُونَ', 'بِشَىْءٍ', 'مِّنْ',
  'عِلْمِهِۦٓ', 'إِلَّا', 'بِمَا', 'شَآءَ', 'وَسِعَ', 'كُرْسِيُّهُ',
  'ٱلسَّمَٰوَٰتِ', 'وَٱلْأَرْضَ', 'وَلَا', 'يَئُودُهُۥ', 'حِفْظُهُمَا', 'وَهُوَ',
  'ٱلْعَلِىُّ', 'ٱلْعَظِيمُ',
]

const words = longAyah.map((text) => `<span class="sa-ov__word is-correct">${text}</span>`).join(' ')

const html = `<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <style>${css}</style>
    <style>
      body { margin: 0; }
      #sa-session-overview.session-analysis-modal-root.modal {
        position: static;
        display: block;
      }
    </style>
  </head>
  <body>
    <div id="sa-session-overview" class="modal fade show d-block session-analysis-modal-root">
      <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-lg">
        <div class="modal-content">
          <div class="modal-body sa-ui-body">
            <div class="sa-ov">
              <section class="sa-ov__panel">
                <h3>Words and ayahs</h3>
                <article class="sa-ov__ayah">
                  <p class="sa-ov__ayah-ar" lang="ar" dir="rtl">
                    ${words}
                    <span class="sa-ov__ayah-no">255</span>
                  </p>
                </article>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  </body>
</html>`

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
await page.setContent(html, { waitUntil: 'domcontentloaded' })

const metrics = await page.evaluate(() => {
  const panel = document.querySelector('.sa-ov__panel')
  const ayah = document.querySelector('.sa-ov__ayah')
  const text = document.querySelector('.sa-ov__ayah-ar')
  const panelBox = panel.getBoundingClientRect()
  const ayahBox = ayah.getBoundingClientRect()
  const textBox = text.getBoundingClientRect()
  return {
    panelWidth: panelBox.width,
    ayahWidth: ayahBox.width,
    textWidth: textBox.width,
    textScrollWidth: text.scrollWidth,
    ayahRight: ayahBox.right,
    panelRight: panelBox.right,
    textRight: textBox.right,
    lineCount: Math.round(textBox.height / parseFloat(getComputedStyle(text).lineHeight)),
  }
})

await browser.close()

assert.ok(metrics.ayahWidth <= metrics.panelWidth + 1, `ayah wider than panel: ${JSON.stringify(metrics)}`)
assert.ok(metrics.textWidth <= metrics.panelWidth + 1, `ayah text wider than panel: ${JSON.stringify(metrics)}`)
assert.ok(metrics.textScrollWidth <= metrics.textWidth + 1, `ayah text scrolls sideways: ${JSON.stringify(metrics)}`)
assert.ok(metrics.textRight <= metrics.panelRight + 1, `ayah text overflows panel right: ${JSON.stringify(metrics)}`)
assert.ok(metrics.lineCount >= 2, `long ayah should wrap onto multiple lines: ${JSON.stringify(metrics)}`)

console.log('session-analysis-ayah-overflow-layout.mjs: ok', metrics)
