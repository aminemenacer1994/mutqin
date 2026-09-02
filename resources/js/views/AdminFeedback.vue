<template>
  <main id="mainContent" class="shell admin-page admin-feedback-page" tabindex="-1">
    <div class="admin-page-head">
      <div>
        <span class="profile-kicker">{{ t('admin.kicker') }}</span>
        <h1>{{ t('admin.feedback.title') }}</h1>
        <p>{{ t('admin.feedback.description') }}</p>
      </div>
      <div class="admin-filter-tabs">
        <a class="billing-secondary-btn" :href="auth.dashboard_url">{{ t('admin.dashboard') }}</a>
        <a class="billing-secondary-btn" :href="auth.contact_inbox_url">{{ t('ui.contact_inbox') }}</a>
      </div>
    </div>

    <div v-if="metrics" class="admin-feedback-metrics profile-card">
      <strong>{{ t('admin.feedback.complaintRate') }}</strong>
      <span>
        {{ metrics.complaint_rate_percent != null ? `${metrics.complaint_rate_percent}%` : '—' }}
        <small>({{ metrics.complaints }} / {{ metrics.valid_checks }})</small>
      </span>
    </div>

    <div class="admin-feedback-toolbar profile-card">
      <label>
        <span>{{ t('admin.feedback.filterStatus') }}</span>
        <select v-model="filters.status" class="form-select" @change="loadList(1)">
          <option value="">{{ t('admin.feedback.allStatuses') }}</option>
          <option v-for="status in statuses" :key="status" :value="status">{{ statusLabel(status) }}</option>
        </select>
      </label>
      <label>
        <span>{{ t('admin.feedback.filterType') }}</span>
        <select v-model="filters.type" class="form-select" @change="loadList(1)">
          <option value="">{{ t('admin.feedback.allTypes') }}</option>
          <option v-for="type in types" :key="type" :value="type">{{ typeLabel(type) }}</option>
        </select>
      </label>
      <label class="admin-feedback-search">
        <span>{{ t('admin.feedback.search') }}</span>
        <input v-model="filters.q" type="search" class="form-control" @keydown.enter.prevent="loadList(1)" />
      </label>
      <button type="button" class="billing-secondary-btn" @click="loadList(1)">{{ t('admin.feedback.apply') }}</button>
    </div>

    <div v-if="loading" class="profile-card" role="status">{{ t('admin.loading') }}</div>
    <div v-else-if="error" class="profile-card admin-feedback-error" role="alert">{{ error }}</div>
    <div v-else-if="!items.length" class="profile-card">{{ t('admin.feedback.empty') }}</div>

    <div v-else class="admin-table-shell profile-card">
      <div class="admin-table-wrap">
        <table class="admin-table admin-feedback-table">
          <thead>
            <tr>
              <th>{{ t('admin.feedback.colType') }}</th>
              <th>{{ t('admin.feedback.colPreview') }}</th>
              <th>{{ t('admin.feedback.colUser') }}</th>
              <th>{{ t('admin.feedback.colArea') }}</th>
              <th>{{ t('admin.feedback.colDevice') }}</th>
              <th>{{ t('admin.feedback.colDate') }}</th>
              <th>{{ t('admin.feedback.colStatus') }}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in items" :key="row.id">
              <td>{{ typeLabel(row.type) }}</td>
              <td>{{ row.message_preview }}</td>
              <td>{{ row.user?.name || row.user?.email }}</td>
              <td>{{ row.route || '—' }}</td>
              <td>{{ row.device || '—' }}</td>
              <td>{{ formatDate(row.created_at) }}</td>
              <td><span class="admin-message-status">{{ row.status }}</span></td>
              <td>
                <button type="button" class="billing-secondary-btn" @click="openDetail(row.id)">
                  {{ t('admin.feedback.view') }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="pagination.total_pages > 1" class="admin-pagination">
        <button type="button" class="billing-secondary-btn" :disabled="pagination.page <= 1" @click="loadList(pagination.page - 1)">←</button>
        <span>{{ pagination.page }} / {{ pagination.total_pages }}</span>
        <button type="button" class="billing-secondary-btn" :disabled="pagination.page >= pagination.total_pages" @click="loadList(pagination.page + 1)">→</button>
      </div>
    </div>

    <div v-if="detail" class="modal-overlay mutqin-modal-overlay admin-feedback-detail-overlay" @click.self="closeDetail">
      <div class="modal-dialog modal-dialog-centered mutqin-modal-dialog">
        <div class="modal-content mutqin-modal-surface admin-feedback-detail" role="dialog" aria-modal="true">
          <div class="modal-header">
            <h2>{{ t('admin.feedback.detailTitle') }} #{{ detail.id }}</h2>
            <button type="button" class="modal-close-btn" :aria-label="t('common.close')" @click="closeDetail">
              <i class="bi bi-x-lg" aria-hidden="true"></i>
            </button>
          </div>
          <div class="modal-body admin-feedback-detail__body">
            <p><strong>{{ typeLabel(detail.type) }}</strong> · {{ detail.user?.name }} · {{ formatDate(detail.created_at) }}</p>
            <p class="admin-feedback-detail__message">{{ detail.message }}</p>
            <dl class="admin-feedback-detail__meta">
              <div><dt>{{ t('admin.feedback.colArea') }}</dt><dd>{{ detail.route || '—' }}</dd></div>
              <div><dt>{{ t('admin.feedback.colDevice') }}</dt><dd>{{ detail.device || '—' }}</dd></div>
              <div><dt>{{ t('admin.feedback.theme') }}</dt><dd>{{ detail.theme || '—' }}</dd></div>
              <div><dt>{{ t('admin.feedback.mushafLayout') }}</dt><dd>{{ detail.mushaf_layout || '—' }}</dd></div>
            </dl>
            <div v-if="detail.related_ai_check" class="admin-feedback-detail__ai">
              <h3>{{ t('admin.feedback.relatedAiCheck') }}</h3>
              <pre>{{ JSON.stringify(detail.related_ai_check, null, 2) }}</pre>
            </div>
            <img v-if="detail.screenshot_url" :src="detail.screenshot_url" alt="" class="admin-feedback-detail__screenshot" />
            <label>
              <span>{{ t('admin.feedback.status') }}</span>
              <select v-model="detailForm.status" class="form-select">
                <option v-for="status in statuses" :key="status" :value="status">{{ statusLabel(status) }}</option>
              </select>
            </label>
            <label>
              <span>{{ t('admin.feedback.adminNote') }}</span>
              <textarea v-model="detailForm.admin_note" class="form-control" rows="3"></textarea>
            </label>
            <p v-if="detailError" class="admin-feedback-error" role="alert">{{ detailError }}</p>
          </div>
          <div class="modal-footer mutqin-modal-footer">
            <div class="mutqin-modal-actions mutqin-modal-actions--end">
              <button type="button" class="btn mutqin-modal-btn mutqin-modal-btn--secondary" @click="closeDetail">{{ t('common.close') }}</button>
              <button type="button" class="btn mutqin-modal-btn mutqin-modal-btn--primary" :disabled="detailSaving" @click="saveDetail">
                {{ detailSaving ? t('admin.feedback.saving') : t('admin.feedback.save') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<script>
const TYPES = ['suggestion', 'bug', 'ai_recitation', 'design', 'other'];
const STATUSES = ['new', 'reviewing', 'planned', 'resolved', 'closed'];

export default {
  name: 'AdminFeedback',
  props: {
    auth: { type: Object, required: true },
  },
  data() {
    return {
      loading: true,
      error: '',
      items: [],
      metrics: null,
      pagination: { page: 1, total_pages: 1 },
      filters: { status: '', type: '', q: '' },
      types: TYPES,
      statuses: STATUSES,
      detail: null,
      detailForm: { status: 'new', admin_note: '' },
      detailSaving: false,
      detailError: '',
    };
  },
  mounted() {
    this.loadMetrics();
    this.loadList(1);
  },
  methods: {
    apiBase() {
      return this.auth.feedback_api_url || '/api/admin/feedback';
    },
    async loadMetrics() {
      try {
        const { data } = await window.axios.get(`${this.apiBase()}/metrics`);
        this.metrics = data?.ai_complaints || null;
      } catch (_) {
        this.metrics = null;
      }
    },
    async loadList(page = 1) {
      this.loading = true;
      this.error = '';
      try {
        const params = new URLSearchParams({ page: String(page), per_page: '20' });
        if (this.filters.status) params.set('status', this.filters.status);
        if (this.filters.type) params.set('type', this.filters.type);
        if (this.filters.q) params.set('q', this.filters.q);
        const { data } = await window.axios.get(`${this.apiBase()}?${params.toString()}`);
        this.items = data?.items || [];
        this.pagination = {
          page: data?.page || page,
          total_pages: data?.total_pages || 1,
        };
      } catch (error) {
        this.error = error?.response?.data?.message || this.t('admin.feedback.loadError');
      } finally {
        this.loading = false;
      }
    },
    async openDetail(id) {
      this.detailError = '';
      try {
        const { data } = await window.axios.get(`${this.apiBase()}/${id}`);
        this.detail = data?.feedback || null;
        this.detailForm = {
          status: this.detail?.status || 'new',
          admin_note: this.detail?.admin_note || '',
        };
      } catch (error) {
        this.detailError = error?.response?.data?.message || this.t('admin.feedback.loadError');
      }
    },
    closeDetail() {
      this.detail = null;
      this.detailError = '';
    },
    async saveDetail() {
      if (!this.detail?.id || this.detailSaving) return;
      this.detailSaving = true;
      this.detailError = '';
      try {
        const { data } = await window.axios.patch(`${this.apiBase()}/${this.detail.id}`, this.detailForm);
        this.detail = data?.feedback || this.detail;
        await this.loadList(this.pagination.page);
        await this.loadMetrics();
      } catch (error) {
        this.detailError = error?.response?.data?.message || this.t('admin.feedback.saveError');
      } finally {
        this.detailSaving = false;
      }
    },
    typeLabel(type) {
      const key = `feedback.types.${type}`;
      const translated = this.t(key);
      return translated === key ? type : translated;
    },
    statusLabel(status) {
      const key = `admin.feedback.statuses.${status}`;
      const translated = this.t(key);
      return translated === key ? status : translated;
    },
    formatDate(value) {
      if (!value) return '—';
      try {
        return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
      } catch (_) {
        return value;
      }
    },
  },
};
</script>

<style scoped>
.admin-feedback-toolbar {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
  align-items: end;
  margin-bottom: 1rem;
}

.admin-feedback-toolbar label {
  display: grid;
  gap: 0.25rem;
  font-size: 0.85rem;
}

.admin-feedback-search {
  grid-column: span 2;
}

.admin-feedback-metrics {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}

.admin-feedback-detail-overlay {
  z-index: 10500;
}

.admin-feedback-detail__body {
  display: grid;
  gap: 0.75rem;
}

.admin-feedback-detail__message {
  white-space: pre-wrap;
}

.admin-feedback-detail__meta {
  display: grid;
  gap: 0.35rem;
}

.admin-feedback-detail__meta div {
  display: grid;
  grid-template-columns: 8rem 1fr;
  gap: 0.5rem;
}

.admin-feedback-detail__screenshot {
  max-width: 100%;
  border-radius: 0.5rem;
}

.admin-feedback-error {
  color: #b42318;
}

.admin-feedback-detail__ai pre {
  font-size: 0.78rem;
  overflow: auto;
  max-height: 10rem;
}
</style>
