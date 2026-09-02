import { http, withRetry } from './learning'

export const adminApi = {
  async getDashboard(days = 30, { fresh = false } = {}) {
    const safeDays = days === 7 ? 7 : 30
    const { data } = await withRetry(() =>
      http.get('/admin/dashboard', {
        params: {
          days: safeDays,
          fresh: fresh ? 1 : undefined,
        },
        headers: {
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
      })
    )
    return data?.data && typeof data.data === 'object' ? data.data : data
  },

  async getFeedback({
    page = 1,
    per_page = 20,
    q = '',
    status = '',
    type = '',
    date_from = '',
    date_to = '',
  } = {}) {
    const { data } = await withRetry(() =>
      http.get('/admin/feedback', {
        params: {
          page,
          per_page,
          q: q || undefined,
          status: status || undefined,
          type: type || undefined,
          date_from: date_from || undefined,
          date_to: date_to || undefined,
        },
        headers: {
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
      })
    )
    return {
      items: Array.isArray(data?.items) ? data.items : [],
      total: Number(data?.total || 0),
      page: Number(data?.page || page || 1),
      per_page: Number(data?.per_page || per_page || 20),
      total_pages: Number(data?.total_pages || 1),
    }
  },

  async getFeedbackDetail(id) {
    const { data } = await withRetry(() => http.get(`/admin/feedback/${id}`))
    return data?.feedback || null
  },

  async updateFeedback(id, payload) {
    const { data } = await http.patch(`/admin/feedback/${id}`, payload)
    return data?.feedback || null
  },

  async deleteFeedback(id) {
    const { data } = await http.delete(`/admin/feedback/${id}`)
    return !!data?.message
  },

  async getUsers({
    limit = 20,
    page = 1,
    per_page = 20,
    q = '',
    status = '',
    activity = '',
    progress = '',
    sessions = '',
    sort = 'created',
    dir = 'desc',
  } = {}) {
    const { data } = await withRetry(() =>
      http.get('/admin/users', {
        params: {
          limit,
          page,
          per_page,
          q: q || undefined,
          status: status || undefined,
          activity: activity || undefined,
          progress: progress || undefined,
          sessions: sessions || undefined,
          sort: sort || undefined,
          dir: dir || undefined,
        },
      })
    )
    return {
      users: Array.isArray(data?.users) ? data.users : [],
      total: Number(data?.total || 0),
      page: Number(data?.page || page || 1),
      per_page: Number(data?.per_page || per_page || 20),
      total_pages: Number(data?.total_pages || 1),
    }
  },

  async bulkUsers(payload) {
    const { data } = await http.post('/admin/users/bulk', payload)
    return data && typeof data === 'object' ? data : { updated: 0, deleted: 0, skipped: 0 }
  },

  async getUser(id) {
    const { data } = await withRetry(() => http.get(`/admin/users/${id}`))
    return data && typeof data === 'object' ? data : null
  },

  async createUser(payload) {
    const { data } = await http.post('/admin/users', payload)
    return data?.user || null
  },

  async updateUser(id, payload) {
    const { data } = await http.patch(`/admin/users/${id}`, payload)
    return data && typeof data === 'object' ? data : null
  },

  async deleteUser(id) {
    const { data } = await http.delete(`/admin/users/${id}`)
    return !!data?.deleted
  },

  async deleteNote(id) {
    const { data } = await http.delete(`/admin/notes/${id}`)
    return !!data?.deleted
  },

  async getActivity(limit = 100) {
    const { data } = await withRetry(() =>
      http.get('/admin/activity', { params: { limit } })
    )
    return Array.isArray(data?.activity) ? data.activity : []
  },

  async getSessions(limit = 100) {
    const { data } = await withRetry(() =>
      http.get('/admin/sessions', { params: { limit } })
    )
    return Array.isArray(data?.sessions) ? data.sessions : []
  },

  async getAiChecks(limit = 100) {
    const { data } = await withRetry(() =>
      http.get('/admin/ai-checks', { params: { limit } })
    )
    return Array.isArray(data?.attempts) ? data.attempts : []
  },

  async getNotes(limit = 100) {
    const { data } = await withRetry(() =>
      http.get('/admin/notes', { params: { limit } })
    )
    return Array.isArray(data?.notes) ? data.notes : []
  },

  async getContacts({ limit = 100, status = 'pending' } = {}) {
    const { data } = await withRetry(() =>
      http.get('/admin/contacts', { params: { limit, status } })
    )
    return Array.isArray(data?.contacts) ? data.contacts : []
  },

  async resolveContact(id) {
    const { data } = await http.patch(`/admin/contacts/${id}/resolve`)
    return data?.contact || null
  },

  async deleteContact(id) {
    const { data } = await http.delete(`/admin/contacts/${id}`)
    return !!data?.deleted
  },
}
