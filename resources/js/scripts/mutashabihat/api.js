import { http } from '../api/learning.js'
import { registerApiMutashabihatPairs } from './pairsIndex.js'

export async function fetchPairsForAyah(verseKey) {
  const vk = String(verseKey || '').trim()
  if (!vk) return []
  try {
    const { data } = await http.get('/mutashabihat/for-ayah', { params: { verse_key: vk } })
    const pairs = data?.pairs || []
    registerApiMutashabihatPairs(pairs)
    return pairs
  } catch {
    return []
  }
}

export async function fetchMutashabihatProgress() {
  const { data } = await http.get('/mutashabihat/progress')
  return data?.progress || []
}

export async function recordMutashabihatConfusion(payload) {
  const { data } = await http.post('/mutashabihat/confusion', payload)
  return data?.progress || null
}

export async function recordMutashabihatPractice(payload) {
  const { data } = await http.post('/mutashabihat/practice', payload)
  return data?.progress || null
}

export async function compareMutashabihatAyahs(payload) {
  const { data } = await http.post('/mutashabihat/compare', payload)
  return data?.diff || null
}
