import axios from 'axios'

function readCsrfToken() {
  if (typeof document === 'undefined') return ''
  return document.head?.querySelector('meta[name="csrf-token"]')?.content || ''
}

export async function interpretAskMutqinCommand(payload) {
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  }
  const csrf = readCsrfToken()
  if (csrf) headers['X-CSRF-TOKEN'] = csrf

  const post = () => axios.post('/api/memorisation/ask-mutqin/interpret', payload, {
    withCredentials: true,
    headers,
  })

  let response
  try {
    response = await post()
  } catch (firstError) {
    if (Number(firstError?.response?.status) !== 419) throw firstError
    await axios.get('/sanctum/csrf-cookie', { withCredentials: true }).catch(() => null)
    response = await post()
  }

  return response?.data || {}
}
