import assert from 'node:assert/strict'
import {
  CORE_TECHNIQUE_IDS,
  getTechniqueDescription,
  getTechniqueLabel,
  getTechniqueShortLabel,
  isKnownTechniqueId,
  listTechniqueDisplays,
  normaliseTechniqueId,
  resolveTechniqueDisplay,
} from '../../resources/js/scripts/techniques/techniqueDisplay.js'
import en from '../../resources/js/locales/en.json' with { type: 'json' }
import ar from '../../resources/js/locales/ar.json' with { type: 'json' }

function makeT(locale) {
  return (key) => {
    const parts = String(key || '').split('.')
    let cursor = locale
    for (const part of parts) {
      if (!cursor || typeof cursor !== 'object' || !(part in cursor)) return key
      cursor = cursor[part]
    }
    return typeof cursor === 'string' ? cursor : key
  }
}

const tEn = makeT(en)
const tAr = makeT(ar)

{
  assert.equal(normaliseTechniqueId('Focus_Mode'), 'focus')
  assert.equal(normaliseTechniqueId('talqin-mode'), 'talqin')
  assert.equal(isKnownTechniqueId('blur'), true)
  assert.equal(isKnownTechniqueId('unknown'), false)
}

{
  const focus = resolveTechniqueDisplay('focus', tEn)
  assert.equal(focus.label, 'One ayah at a time (Focus)')
  assert.match(focus.label, /\(Focus\)/)
  assert.equal(getTechniqueLabel('talqin', tEn), 'Listen and repeat (Talqin)')
  assert.equal(getTechniqueLabel('blur', tEn), 'Gradually hide the text (Blur)')
  assert.equal(getTechniqueDescription('talqin', tEn), 'Listen to each section, then repeat it')
  assert.equal(getTechniqueDescription('focus', tEn), 'Concentrate on one ayah before moving forward')
  assert.equal(getTechniqueDescription('blur', tEn), 'Hide more of the text gradually to strengthen recall')
}

{
  const chaining = resolveTechniqueDisplay('chaining', tEn)
  const anchor = resolveTechniqueDisplay('anchor', tEn)
  assert.match(chaining.label, /\(Chaining\)/)
  assert.equal(
    chaining.description,
    'Link each ayah to the next and practise the range as one continuous sequence.'
  )
  assert.equal(
    en.memorisation.techniques.chainingOffDescription,
    chaining.description
  )
  assert.equal(
    en.memorisation.techniques.chainingOffSub,
    chaining.description
  )
  assert.match(anchor.label, /\(Anchor\)/)
  assert.match(getTechniqueLabel('linking', tEn), /\(Linking\)/)
  assert.match(getTechniqueLabel('cumulative', tEn), /\(Cumulative\)/)
}

{
  for (const id of CORE_TECHNIQUE_IDS) {
    const short = getTechniqueShortLabel(id, tEn)
    const full = getTechniqueLabel(id, tEn)
    assert.equal(short, full)
    assert.match(full, /\(/)
    assert.match(full, /\)/)
  }
}

{
  const listed = listTechniqueDisplays(tEn)
  assert.equal(listed.length, 3)
  assert.deepEqual(listed.map(item => item.id), ['talqin', 'focus', 'blur'])
}

{
  assert.equal(getTechniqueLabel('talqin', tAr), 'استمع وكرّر (تلقين)')
  assert.equal(getTechniqueLabel('focus', tAr), 'آية واحدة في كل مرة (تركيز)')
  assert.equal(getTechniqueLabel('blur', tAr), 'أخفِ النص تدريجياً (تمويه)')
}

{
  // Legacy keys stay aligned with the shared resolver labels.
  assert.equal(en.memorisation.focus_mode, getTechniqueLabel('focus', tEn))
  assert.equal(en.memorisation.blur_mode, getTechniqueLabel('blur', tEn))
  assert.equal(en.memorisation.talqinMode.title, getTechniqueLabel('talqin', tEn))
  assert.equal(en.memorisation.postSession.recommendation.techniques.talqinShort, getTechniqueShortLabel('talqin', tEn))
  assert.equal(en.memorisation.postSession.recommendation.techniques.focusShort, getTechniqueShortLabel('focus', tEn))
  assert.equal(en.memorisation.postSession.recommendation.techniques.blurShort, getTechniqueShortLabel('blur', tEn))
}

console.log('Technique display tests passed')
