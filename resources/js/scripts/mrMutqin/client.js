import axios from 'axios'
import { buildCsrfHeaders, ensureCsrfCookie, withCsrfRetry } from '../http/csrf.js'

let interpretController = null

export async function interpretMrMutqin(payload) {
  await ensureCsrfCookie()
  interpretController?.abort()
  interpretController = new AbortController()
  try {
    const response = await withCsrfRetry(() => axios.post('/api/mr-mutqin/interpret', payload, {
      withCredentials: true,
      signal: interpretController.signal,
      headers: buildCsrfHeaders({ 'Content-Type': 'application/json' }),
      validateStatus: (status) => (status >= 200 && status < 300) || status === 422,
    }))
    return response?.data || {}
  } catch (error) {
    if (error?.response?.status === 422 && error.response.data) {
      return error.response.data
    }
    throw error
  }
}

export async function fetchMrMutqinSuggestions(context = {}) {
  await ensureCsrfCookie()
  const response = await withCsrfRetry(() => axios.get('/api/mr-mutqin/suggestions', {
    withCredentials: true,
    params: context,
    headers: buildCsrfHeaders(),
  }))
  return response?.data || {}
}

export function cancelMrMutqinInterpret() {
  interpretController?.abort()
  interpretController = null
}