import { ALQURAN_RECITER_OPTIONS } from '../memorisationRuntime.js'

const ALIASES = Object.freeze({
  mishary: 'ar.alafasy',
  mishari: 'ar.alafasy',
  'mishari rashid': 'ar.alafasy',
  'mishary rashid': 'ar.alafasy',
  alafasy: 'ar.alafasy',
  afasy: 'ar.alafasy',
  'al-afasy': 'ar.alafasy',
  husary: 'ar.husary',
  'al-husary': 'ar.husary',
  minshawi: 'ar.minshawi',
  sudais: 'ar.abdurrahmaansudais',
  'as-sudais': 'ar.abdurrahmaansudais',
  shatri: 'ar.shaatree',
  'ash-shatri': 'ar.shaatree',
  muaiqly: 'ar.mahermuaiqly',
  maher: 'ar.mahermuaiqly',
  hudhaify: 'ar.hudhaify',
  basfar: 'ar.abdullahbasfar',
  ayyoub: 'ar.muhammadayyoub',
  jibreel: 'ar.muhammadjibreel',
  ajamy: 'ar.ahmedajamy',
  rifai: 'ar.hanirifai',
  shuraym: 'ar.saoodshuraym',
  'abdul basit': 'ar.abdulbasitmurattal',
  abdulbasit: 'ar.abdulbasitmurattal',
  parhizgar: 'ar.parhizgar',
  sowaid: 'ar.aymanswoaid',
  akhdar: 'ar.ibrahimakhbar',
})

function foldReciterName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function resolveAskMutqinReciter(value, reciters = ALQURAN_RECITER_OPTIONS) {
  const raw = String(value || '').trim()
  if (!raw) return null
  const list = Array.isArray(reciters) && reciters.length ? reciters : ALQURAN_RECITER_OPTIONS
  const byId = list.find((item) => item?.id === raw)
  if (byId) return { id: byId.id, name: byId.name }

  const folded = foldReciterName(raw)
  const aliasId = ALIASES[folded]
  if (aliasId) {
    const match = list.find((item) => item.id === aliasId)
    if (match) return { id: match.id, name: match.name }
  }

  const named = list.find((item) => {
    const name = foldReciterName(item?.name)
    return name === folded || name.includes(folded) || folded.includes(name)
  })
  return named ? { id: named.id, name: named.name } : null
}
