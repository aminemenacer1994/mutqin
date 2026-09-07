import axios from 'axios'
import { buildCsrfHeaders, ensureCsrfCookie, withCsrfRetry } from '../http/csrf.js'

export async function interpretAskMutqinCommand(payload) {
  await ensureCsrfCookie()
  const response = await withCsrfRetry(() => axios.post('/api/memorisation/ask-mutqin/interpret', payload, {
    withCredentials: true,
    headers: buildCsrfHeaders({ 'Content-Type': 'application/json' }),
  }))

  return response?.data || {}
}
