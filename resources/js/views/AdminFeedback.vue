<template>
  <main id="mainContent" class="shell admin-page admin-feedback-page" tabindex="-1">
    <div class="admin-page-head">
      <div>
        <span class="profile-kicker">{{ t('admin.kicker') }}</span>
        <h1>{{ t('admin.feedback.title') }}</h1>
        <p>
          {{ t('admin.feedback.description') }}
          <span
            v-if="metrics"
            class="afb-metrics-inline"
            data-testid="ai-complaint-rate"
          >
            · {{ t('admin.feedback.complaintRate') }}:
            {{ complaintRateLabel }}
            <span class="afb-metrics-inline__counts">({{ metrics.complaints }} / {{ metrics.valid_checks }})</span>
          </span>
        </p>
      </div>
      <div class="admin-filter-tabs">
        <a class="billing-secondary-btn" :href="auth.dashboard_url">{{ t('admin.dashboard') }}</a>
        <a class="billing-secondary-btn" :href="auth.contact_inbox_url">{{ t('ui.contact_inbox') }}</a>
      </div>
    </div>

    <section class="afb-toolbar" :aria-label="t('common.filters')">
      <label class="afb-field">
        <span>{{ t('admin.feedback.filterStatus') }}</span>
        <select v-model="filters.status" class="afb-input" @change="loadList(1)">
          <option value="">{{ t('admin.feedback.allStatuses') }}</option>
          <option v-for="status in statuses" :key="status" :value="status">{{ statusLabel(status) }}</option>
        </select>
      </label>

      <label class="afb-field">
        <span>{{ t('admin.feedback.filterType') }}</span>
        <select v-model="filters.type" class="afb-input" @change="loadList(1)">
          <option value="">{{ t('admin.feedback.allTypes') }}</option>
          <option v-for="type in types" :key="type" :value="type">{{ typeLabel(type) }}</option>
        </select>
      </label>

      <label class="afb-field">
        <span>{{ t('admin.feedback.filterFrom') }}</span>
        <input v-model="filters.date_from" type="date" class="afb-input" @change="onDateFilterChange" />
      </label>

      <label class="afb-field">
        <span>{{ t('admin.feedback.filterTo') }}</span>
        <input v-model="filters.date_to" type="date" class="afb-input" @change="onDateFilterChange" />
      </label>

      <label class="afb-field afb-field--search">
        <span>{{ t('admin.feedback.search') }}</span>
        <input
          v-model="filters.q"
          type="search"
          class="afb-input"
          :placeholder="t('admin.feedback.searchPlaceholder')"
          @keydown.enter.prevent="loadList(1)"
        />
      </label>

      <div class="afb-toolbar__actions">
        <button type="button" class="afb-btn afb-btn--ghost" @click="clearFilters">{{ t('admin.feedback.clear') }}</button>
        <button type="button" class="afb-btn afb-btn--primary" @click="applyFilters">{{ t('admin.feedback.apply') }}</button>
      </div>
    </section>

    <div v-if="flash" class="afb-flash" role="status">{{ flash }}</div>
    <div v-if="loading" class="afb-state" role="status">{{ t('admin.loading') }}</div>
    <div v-else-if="error" class="afb-state afb-state--error" role="alert">{{ error }}</div>
    <div v-else-if="!items.length" class="afb-state">{{ t('admin.feedback.empty') }}</div>

    <section v-else class="afb-panel">
      <div class="afb-panel__meta">
        <span>{{ resultsLabel }}</span>
      </div>

      <!-- Desktop / tablet table -->
      <div class="afb-table-wrap">
        <table class="afb-table">
          <thead>
            <tr>
              <th>{{ t('admin.feedback.colType') }}</th>
              <th>{{ t('admin.feedback.colPreview') }}</th>
              <th>{{ t('admin.feedback.colUser') }}</th>
              <th class="afb-hide-md">{{ t('admin.feedback.colArea') }}</th>
              <th class="afb-hide-lg">{{ t('admin.feedback.colDevice') }}</th>
              <th>{{ t('admin.feedback.colDate') }}</th>
              <th>{{ t('admin.feedback.colStatus') }}</th>
              <th class="afb-table__actions">{{ t('admin.feedback.colActions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in items" :key="row.id">
              <td>
                <span class="afb-type" :data-type="row.type">{{ typeLabel(row.type) }}</span>
              </td>
              <td>
                <button type="button" class="afb-preview" @click="openDetail(row.id)">
                  {{ row.message_preview }}
                </button>
              </td>
              <td>
                <div class="afb-user">
                  <strong>{{ row.user?.name || '—' }}</strong>
                  <span>{{ row.user?.email || '' }}</span>
                </div>
              </td>
              <td class="afb-hide-md afb-muted">{{ row.route || '—' }}</td>
              <td class="afb-hide-lg afb-muted">{{ row.device || '—' }}</td>
              <td class="afb-muted">{{ formatDate(row.created_at) }}</td>
              <td>
                <span class="afb-status" :data-status="row.status">{{ statusLabel(row.status) }}</span>
              </td>
              <td class="afb-table__actions">
                <div class="afb-row-actions">
                  <button type="button" class="afb-btn afb-btn--ghost afb-btn--sm" @click="openDetail(row.id)">
                    {{ t('admin.feedback.view') }}
                  </button>
                  <button
                    type="button"
                    class="afb-btn afb-btn--danger afb-btn--sm"
                    :disabled="deletingId === row.id"
                    @click="confirmDelete(row)"
                  >
                    {{ deletingId === row.id ? t('admin.feedback.deleting') : t('admin.feedback.delete') }}
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mobile cards -->
      <div class="afb-cards" :aria-label="t('admin.feedback.title')">
        <article v-for="row in items" :key="`card-${row.id}`" class="afb-card">
          <header class="afb-card__head">
            <span class="afb-type" :data-type="row.type">{{ typeLabel(row.type) }}</span>
            <span class="afb-status" :data-status="row.status">{{ statusLabel(row.status) }}</span>
          </header>
          <p class="afb-card__message">{{ row.message_preview }}</p>
          <dl class="afb-card__meta">
            <div>
              <dt>{{ t('admin.feedback.colUser') }}</dt>
              <dd>{{ row.user?.name || row.user?.email || '—' }}</dd>
            </div>
            <div>
              <dt>{{ t('admin.feedback.colDate') }}</dt>
              <dd>{{ formatDate(row.created_at) }}</dd>
            </div>
            <div v-if="row.route">
              <dt>{{ t('admin.feedback.colArea') }}</dt>
              <dd>{{ row.route }}</dd>
            </div>
          </dl>
          <div class="afb-card__actions">
            <button type="button" class="afb-btn afb-btn--ghost" @click="openDetail(row.id)">
              {{ t('admin.feedback.view') }}
            </button>
            <button
              type="button"
              class="afb-btn afb-btn--danger"
              :disabled="deletingId === row.id"
              @click="confirmDelete(row)"
            >
              {{ deletingId === row.id ? t('admin.feedback.deleting') : t('admin.feedback.delete') }}
            </button>
          </div>
        </article>
      </div>

      <div v-if="pagination.total_pages > 1" class="afb-pagination">
        <button
          type="button"
          class="afb-btn afb-btn--ghost"
          :disabled="pagination.page <= 1"
          @click="loadList(pagination.page - 1)"
        >
          ←
        </button>
        <span>{{ pagination.page }} / {{ pagination.total_pages }}</span>
        <button
          type="button"
          class="afb-btn afb-btn--ghost"
          :disabled="pagination.page >= pagination.total_pages"
          @click="loadList(pagination.page + 1)"
        >
          →
        </button>
      </div>
    </section>

    <Teleport to="body">
      <div
        v-if="detail"
        class="afb-modal-overlay"
        @click.self="closeDetail"
      >
        <div
          class="afb-modal"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="'afb-detail-title'"
          @keydown.esc.prevent="closeDetail"
        >
          <header class="afb-modal__header">
            <div>
              <h2 :id="'afb-detail-title'">{{ t('admin.feedback.detailTitle') }} #{{ detail.id }}</h2>
              <p class="afb-modal__sub">
                <span class="afb-type" :data-type="detail.type">{{ typeLabel(detail.type) }}</span>
                <span>{{ detail.user?.name || detail.user?.email }}</span>
                <span>{{ formatDate(detail.created_at) }}</span>
              </p>
            </div>
            <button
              type="button"
              class="afb-modal__close"
              :aria-label="t('common.close')"
              @click="closeDetail"
            >
              <i class="bi bi-x-lg" aria-hidden="true"></i>
            </button>
          </header>

          <div class="afb-modal__body">
            <section class="afb-modal__block">
              <h3>{{ t('admin.feedback.message') }}</h3>
              <p class="afb-modal__message">{{ detail.message }}</p>
            </section>

            <dl class="afb-modal__meta">
              <div>
                <dt>{{ t('admin.feedback.colArea') }}</dt>
                <dd>{{ detail.route || '—' }}</dd>
              </div>
              <div>
                <dt>{{ t('admin.feedback.colDevice') }}</dt>
                <dd>{{ detail.device || '—' }}</dd>
              </div>
              <div>
                <dt>{{ t('admin.feedback.theme') }}</dt>
                <dd>{{ detail.theme || '—' }}</dd>
              </div>
              <div>
                <dt>{{ t('admin.feedback.mushafLayout') }}</dt>
                <dd>{{ detail.mushaf_layout || '—' }}</dd>
              </div>
              <div>
                <dt>{{ t('admin.feedback.language') }}</dt>
                <dd>{{ detail.language || '—' }}</dd>
              </div>
              <div v-if="detail.ai_reason">
                <dt>{{ t('admin.feedback.aiReason') }}</dt>
                <dd>{{ detail.ai_reason }}</dd>
              </div>
            </dl>

            <section v-if="detail.related_ai_check" class="afb-modal__block">
              <h3>{{ t('admin.feedback.relatedAiCheck') }}</h3>
              <pre class="afb-modal__pre">{{ JSON.stringify(detail.related_ai_check, null, 2) }}</pre>
            </section>

            <img
              v-if="detail.screenshot_url"
              :src="detail.screenshot_url"
              alt=""
              class="afb-modal__screenshot"
            />

            <label class="afb-field">
              <span>{{ t('admin.feedback.status') }}</span>
              <select v-model="detailForm.status" class="afb-input">
                <option v-for="status in statuses" :key="status" :value="status">{{ statusLabel(status) }}</option>
              </select>
            </label>

            <label class="afb-field">
              <span>{{ t('admin.feedback.adminNote') }}</span>
              <textarea v-model="detailForm.admin_note" class="afb-input afb-input--area" rows="3"></textarea>
            </label>

            <p v-if="detailError" class="afb-state afb-state--error" role="alert">{{ detailError }}</p>
          </div>

          <footer class="afb-modal__footer">
            <button
              type="button"
              class="afb-btn afb-btn--danger"
              :disabled="deletingId === detail.id"
              @click="confirmDelete(detail, true)"
            >
              {{ deletingId === detail.id ? t('admin.feedback.deleting') : t('admin.feedback.delete') }}
            </button>
            <div class="afb-modal__footer-end">
              <button type="button" class="afb-btn afb-btn--ghost" @click="closeDetail">
                {{ t('common.close') }}
              </button>
              <button
                type="button"
                class="afb-btn afb-btn--primary"
                :disabled="detailSaving"
                @click="saveDetail"
              >
                {{ detailSaving ? t('admin.feedback.saving') : t('admin.feedback.save') }}
              </button>
            </div>
          </footer>
        </div>
      </div>
    </Teleport>
  </main>
</template>

<script>
import { formatAppDateTime, unwrapLocale } from '../utils/i18nFormat';

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
      flash: '',
      flashTimer: null,
      items: [],
      total: 0,
      metrics: null,
      pagination: { page: 1, total_pages: 1 },
      filters: { status: '', type: '', q: '', date_from: '', date_to: '' },
      types: TYPES,
      statuses: STATUSES,
      detail: null,
      detailForm: { status: 'new', admin_note: '' },
      detailSaving: false,
      detailError: '',
      deletingId: null,
    };
  },
  computed: {
    resultsLabel() {
      const count = this.total;
      const raw = this.t('admin.feedback.results', { count });
      if (typeof raw === 'string' && raw.includes('|')) {
        const [one, many] = raw.split('|');
        return (count === 1 ? one : many).replace('{count}', String(count));
      }
      return String(raw).replace('{count}', String(count));
    },
    complaintRateLabel() {
      const rate = this.metrics?.complaint_rate_percent;
      if (rate == null || Number.isNaN(Number(rate))) return '—';
      return `${Number(Number(rate).toFixed(1))}%`;
    },
  },
  mounted() {
    this.loadMetrics();
    this.loadList(1);
  },
  beforeUnmount() {
    if (this.flashTimer) window.clearTimeout(this.flashTimer);
  },
  methods: {
    apiBase() {
      return this.auth.feedback_api_url || '/api/admin/feedback';
    },
    showFlash(message) {
      this.flash = message;
      if (this.flashTimer) window.clearTimeout(this.flashTimer);
      this.flashTimer = window.setTimeout(() => {
        this.flash = '';
      }, 2800);
    },
    clearFilters() {
      this.filters = { status: '', type: '', q: '', date_from: '', date_to: '' };
      this.loadMetrics();
      this.loadList(1);
    },
    applyFilters() {
      this.loadMetrics();
      this.loadList(1);
    },
    onDateFilterChange() {
      this.loadMetrics();
      this.loadList(1);
    },
    async loadMetrics() {
      try {
        const params = new URLSearchParams();
        if (this.filters.date_from) params.set('date_from', this.filters.date_from);
        if (this.filters.date_to) params.set('date_to', this.filters.date_to);
        const query = params.toString();
        const { data } = await window.axios.get(
          `${this.apiBase()}/metrics${query ? `?${query}` : ''}`
        );
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
        if (this.filters.date_from) params.set('date_from', this.filters.date_from);
        if (this.filters.date_to) params.set('date_to', this.filters.date_to);
        const { data } = await window.axios.get(`${this.apiBase()}?${params.toString()}`);
        this.items = data?.items || [];
        this.total = Number(data?.total || 0);
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
    async confirmDelete(row, fromModal = false) {
      if (!row?.id || this.deletingId) return;
      const ok = window.confirm(this.t('admin.feedback.deleteConfirm'));
      if (!ok) return;

      this.deletingId = row.id;
      try {
        await window.axios.delete(`${this.apiBase()}/${row.id}`);
        if (fromModal || this.detail?.id === row.id) this.closeDetail();
        this.showFlash(this.t('admin.feedback.deleted'));
        await this.loadList(this.pagination.page);
        await this.loadMetrics();
      } catch (error) {
        this.error = error?.response?.data?.message || this.t('admin.feedback.deleteError');
      } finally {
        this.deletingId = null;
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
        return formatAppDateTime(value, unwrapLocale(this.$i18n?.locale));
      } catch (_) {
        return value;
      }
    },
  },
};
</script>

<style scoped>
.admin-feedback-page {
  --afb-bg: #fffaf4;
  --afb-panel: #ffffff;
  --afb-panel-soft: #fff6ec;
  --afb-text: #2c241c;
  --afb-muted: #6f5f4f;
  --afb-border: #e3d5c4;
  --afb-line: #eadfce;
  --afb-input: #ffffff;
  --afb-input-border: #dccdb8;
  --afb-accent: #8b5e3c;
  --afb-accent-strong: #6f4a2f;
  --afb-danger: #b42318;
  --afb-danger-soft: #fdecec;
  --afb-shadow: 0 10px 28px rgba(44, 36, 28, 0.08);
  display: grid;
  gap: 1rem;
}

.afb-toolbar,
.afb-panel,
.afb-state,
.afb-flash {
  background: var(--afb-panel);
  border: 1px solid var(--afb-border);
  border-radius: 16px;
  box-shadow: var(--afb-shadow);
}

.afb-metrics-inline {
  color: var(--afb-muted);
  font-size: 0.92em;
  white-space: nowrap;
}

.afb-metrics-inline__counts {
  opacity: 0.85;
}

.afb-toolbar {
  display: grid;
  gap: 0.85rem;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  padding: 1rem 1.15rem;
  align-items: end;
}

.afb-field {
  display: grid;
  gap: 0.35rem;
  min-width: 0;
}

.afb-field span {
  font-size: 0.78rem;
  font-weight: 650;
  color: var(--afb-muted);
}

.afb-field--search {
  grid-column: span 2;
}

.afb-input {
  width: 100%;
  min-height: 2.55rem;
  border-radius: 12px;
  border: 1px solid var(--afb-input-border);
  background: var(--afb-input);
  color: var(--afb-text);
  padding: 0.55rem 0.75rem;
  font-size: 0.9rem;
}

.afb-input--area {
  min-height: 5.5rem;
  resize: vertical;
}

.afb-input:focus {
  outline: 2px solid color-mix(in srgb, var(--afb-accent) 35%, transparent);
  outline-offset: 1px;
  border-color: var(--afb-accent);
}

.afb-toolbar__actions {
  grid-column: 1 / -1;
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
  justify-content: flex-end;
}

.afb-btn {
  min-height: 2.45rem;
  border-radius: 999px;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  font-weight: 600;
  border: 1px solid transparent;
  cursor: pointer;
  white-space: nowrap;
}

.afb-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.afb-btn--sm {
  min-height: 2.1rem;
  padding: 0.35rem 0.8rem;
  font-size: 0.8rem;
}

.afb-btn--ghost {
  background: var(--afb-panel-soft);
  border-color: var(--afb-input-border);
  color: var(--afb-text);
}

.afb-btn--primary {
  background: linear-gradient(135deg, var(--afb-accent), var(--afb-accent-strong));
  color: #fff;
}

.afb-btn--danger {
  background: var(--afb-danger-soft);
  border-color: color-mix(in srgb, var(--afb-danger) 28%, var(--afb-border));
  color: var(--afb-danger);
}

.afb-flash {
  padding: 0.85rem 1.1rem;
  color: #166534;
  background: #ecfdf3;
  border-color: #bbf7d0;
}

.afb-state {
  padding: 1.25rem 1.15rem;
  color: var(--afb-muted);
}

.afb-state--error {
  color: var(--afb-danger);
  background: var(--afb-danger-soft);
}

.afb-panel {
  overflow: hidden;
}

.afb-panel__meta {
  padding: 0.85rem 1.15rem;
  border-bottom: 1px solid var(--afb-line);
  color: var(--afb-muted);
  font-size: 0.85rem;
}

.afb-table-wrap {
  overflow: auto;
  -webkit-overflow-scrolling: touch;
}

.afb-table {
  width: 100%;
  min-width: 720px;
  border-collapse: separate;
  border-spacing: 0;
}

.afb-table th,
.afb-table td {
  padding: 0.85rem 1rem;
  text-align: left;
  vertical-align: middle;
  border-bottom: 1px solid var(--afb-line);
  color: var(--afb-text);
  font-size: 0.875rem;
}

.afb-table th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: var(--afb-panel-soft);
  color: var(--afb-muted);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  white-space: nowrap;
}

.afb-table tbody tr:hover td {
  background: color-mix(in srgb, var(--afb-panel-soft) 70%, transparent);
}

.afb-table__actions {
  width: 1%;
  white-space: nowrap;
}

.afb-row-actions {
  display: inline-flex;
  gap: 0.4rem;
}

.afb-preview {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  max-width: 22rem;
  border: 0;
  background: transparent;
  color: var(--afb-text);
  text-align: left;
  padding: 0;
  cursor: pointer;
  line-height: 1.45;
}

.afb-preview:hover {
  color: var(--afb-accent-strong);
  text-decoration: underline;
}

.afb-user {
  display: grid;
  gap: 0.15rem;
  min-width: 0;
}

.afb-user strong {
  font-weight: 650;
}

.afb-user span {
  color: var(--afb-muted);
  font-size: 0.78rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 12rem;
}

.afb-muted {
  color: var(--afb-muted);
}

.afb-type,
.afb-status {
  display: inline-flex;
  align-items: center;
  min-height: 1.55rem;
  padding: 0.15rem 0.55rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 650;
  border: 1px solid var(--afb-border);
  background: var(--afb-panel-soft);
  color: var(--afb-text);
  white-space: nowrap;
}

.afb-status[data-status='new'] {
  background: #eff6ff;
  border-color: #bfdbfe;
  color: #1d4ed8;
}

.afb-status[data-status='reviewing'] {
  background: #fff7ed;
  border-color: #fed7aa;
  color: #c2410c;
}

.afb-status[data-status='planned'] {
  background: #f5f3ff;
  border-color: #ddd6fe;
  color: #6d28d9;
}

.afb-status[data-status='resolved'] {
  background: #ecfdf3;
  border-color: #bbf7d0;
  color: #15803d;
}

.afb-status[data-status='closed'] {
  background: #f3f4f6;
  border-color: #e5e7eb;
  color: #4b5563;
}

.afb-cards {
  display: none;
}

.afb-card {
  display: grid;
  gap: 0.75rem;
  padding: 1rem 1.1rem;
  border-bottom: 1px solid var(--afb-line);
}

.afb-card:last-child {
  border-bottom: 0;
}

.afb-card__head {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.afb-card__message {
  margin: 0;
  color: var(--afb-text);
  line-height: 1.5;
}

.afb-card__meta {
  margin: 0;
  display: grid;
  gap: 0.45rem;
}

.afb-card__meta div {
  display: grid;
  grid-template-columns: 5.5rem 1fr;
  gap: 0.5rem;
  font-size: 0.85rem;
}

.afb-card__meta dt {
  color: var(--afb-muted);
}

.afb-card__meta dd {
  margin: 0;
  color: var(--afb-text);
}

.afb-card__actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.55rem;
}

.afb-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 0.9rem 1rem;
  border-top: 1px solid var(--afb-line);
  color: var(--afb-muted);
}

.afb-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 250000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding:
    max(1rem, env(safe-area-inset-top))
    max(1rem, env(safe-area-inset-right))
    max(1rem, env(safe-area-inset-bottom))
    max(1rem, env(safe-area-inset-left));
  background: rgba(12, 10, 8, 0.58);
  backdrop-filter: blur(6px);
}

.afb-modal {
  width: min(100%, 36rem);
  max-height: min(90dvh, 44rem);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 18px;
  background: var(--afb-panel);
  color: var(--afb-text);
  border: 1px solid var(--afb-border);
  box-shadow: 0 24px 56px rgba(0, 0, 0, 0.24);
}

.afb-modal__header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.2rem 1.35rem 1rem;
  border-bottom: 1px solid var(--afb-line);
  background: var(--afb-panel-soft);
}

.afb-modal__header h2 {
  margin: 0;
  font-size: 1.1rem;
}

.afb-modal__sub {
  margin: 0.55rem 0 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem 0.75rem;
  color: var(--afb-muted);
  font-size: 0.85rem;
}

.afb-modal__close {
  width: 2.25rem;
  height: 2.25rem;
  border: 0;
  border-radius: 999px;
  background: var(--afb-input);
  border: 1px solid var(--afb-input-border);
  color: var(--afb-muted);
  display: grid;
  place-items: center;
  cursor: pointer;
}

.afb-modal__body {
  display: grid;
  gap: 1rem;
  padding: 1.2rem 1.35rem;
  overflow: auto;
}

.afb-modal__block h3 {
  margin: 0 0 0.45rem;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--afb-muted);
}

.afb-modal__message {
  margin: 0;
  white-space: pre-wrap;
  line-height: 1.55;
}

.afb-modal__meta {
  margin: 0;
  display: grid;
  gap: 0.55rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.afb-modal__meta div {
  display: grid;
  gap: 0.2rem;
  padding: 0.7rem 0.8rem;
  border-radius: 12px;
  background: var(--afb-panel-soft);
  border: 1px solid var(--afb-line);
}

.afb-modal__meta dt {
  font-size: 0.72rem;
  color: var(--afb-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.afb-modal__meta dd {
  margin: 0;
  font-size: 0.9rem;
  word-break: break-word;
}

.afb-modal__pre {
  margin: 0;
  padding: 0.75rem;
  border-radius: 12px;
  background: var(--afb-panel-soft);
  border: 1px solid var(--afb-line);
  font-size: 0.75rem;
  overflow: auto;
  max-height: 10rem;
}

.afb-modal__screenshot {
  max-width: 100%;
  border-radius: 12px;
  border: 1px solid var(--afb-border);
}

.afb-modal__footer {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 0.65rem;
  padding: 1rem 1.35rem 1.2rem;
  border-top: 1px solid var(--afb-line);
  background: var(--afb-panel-soft);
}

.afb-modal__footer-end {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
  margin-left: auto;
}

@media (max-width: 960px) {
  .afb-toolbar {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .afb-field--search {
    grid-column: span 2;
  }

  .afb-hide-lg {
    display: none;
  }
}

@media (max-width: 720px) {
  .afb-table-wrap {
    display: none;
  }

  .afb-cards {
    display: block;
  }

  .afb-toolbar {
    grid-template-columns: 1fr;
  }

  .afb-field--search {
    grid-column: auto;
  }

  .afb-toolbar__actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }

  .afb-toolbar__actions .afb-btn,
  .afb-card__actions .afb-btn,
  .afb-modal__footer .afb-btn {
    width: 100%;
  }

  .afb-modal__meta {
    grid-template-columns: 1fr;
  }

  .afb-modal__footer {
    flex-direction: column-reverse;
  }

  .afb-modal__footer-end {
    width: 100%;
    display: grid;
    grid-template-columns: 1fr 1fr;
    margin-left: 0;
  }

  .afb-hide-md {
    display: none;
  }
}
</style>

<style>
.afb-modal,
.admin-feedback-page {
  --afb-bg: #fffaf4;
  --afb-panel: #ffffff;
  --afb-panel-soft: #fff6ec;
  --afb-text: #2c241c;
  --afb-muted: #6f5f4f;
  --afb-border: #e3d5c4;
  --afb-line: #eadfce;
  --afb-input: #ffffff;
  --afb-input-border: #dccdb8;
  --afb-accent: #8b5e3c;
  --afb-accent-strong: #6f4a2f;
  --afb-danger: #b42318;
  --afb-danger-soft: #fdecec;
  --afb-shadow: 0 10px 28px rgba(44, 36, 28, 0.08);
}

html[data-theme='light'] .admin-feedback-page,
html[data-theme='light'] .afb-modal {
  --afb-bg: #f8fafc;
  --afb-panel: #ffffff;
  --afb-panel-soft: #f8fafc;
  --afb-text: #1f2937;
  --afb-muted: #64748b;
  --afb-border: #e2e8f0;
  --afb-line: #e2e8f0;
  --afb-input: #ffffff;
  --afb-input-border: #cbd5e1;
  --afb-accent: #8b5e3c;
  --afb-accent-strong: #6f4a2f;
  --afb-danger: #b42318;
  --afb-danger-soft: #fef2f2;
  --afb-shadow: 0 10px 28px rgba(15, 23, 42, 0.06);
}

html[data-theme='sepia'] .admin-feedback-page,
html[data-theme='sepia'] .afb-modal {
  --afb-bg: #f1e7d8;
  --afb-panel: #f7efe3;
  --afb-panel-soft: #f1e7d8;
  --afb-text: #2c241c;
  --afb-muted: #6f5f4f;
  --afb-border: #dccdb8;
  --afb-line: #dccdb8;
  --afb-input: #fff8ed;
  --afb-input-border: #d4c4ae;
  --afb-accent: #8b5e3c;
  --afb-accent-strong: #6f4a2f;
  --afb-danger: #9f2d1f;
  --afb-danger-soft: #f8e8e4;
  --afb-shadow: 0 10px 28px rgba(44, 36, 28, 0.1);
}

html[data-theme='dark'] .admin-feedback-page,
html[data-theme='dark'] .afb-modal {
  --afb-bg: #171311;
  --afb-panel: #221d19;
  --afb-panel-soft: #1c1714;
  --afb-text: #f4ede4;
  --afb-muted: #b8a99a;
  --afb-border: rgba(255, 255, 255, 0.12);
  --afb-line: rgba(255, 255, 255, 0.1);
  --afb-input: #2a2420;
  --afb-input-border: rgba(255, 255, 255, 0.14);
  --afb-accent: #c0895f;
  --afb-accent-strong: #a8744a;
  --afb-danger: #fecaca;
  --afb-danger-soft: rgba(127, 29, 29, 0.35);
  --afb-shadow: 0 14px 36px rgba(0, 0, 0, 0.35);
}

html[data-theme='dark'] .afb-status[data-status='new'] {
  background: rgba(37, 99, 235, 0.2);
  border-color: rgba(96, 165, 250, 0.35);
  color: #93c5fd;
}

html[data-theme='dark'] .afb-status[data-status='reviewing'] {
  background: rgba(194, 65, 12, 0.22);
  border-color: rgba(251, 146, 60, 0.35);
  color: #fdba74;
}

html[data-theme='dark'] .afb-status[data-status='planned'] {
  background: rgba(109, 40, 217, 0.22);
  border-color: rgba(167, 139, 250, 0.35);
  color: #c4b5fd;
}

html[data-theme='dark'] .afb-status[data-status='resolved'] {
  background: rgba(21, 128, 61, 0.22);
  border-color: rgba(74, 222, 128, 0.3);
  color: #86efac;
}

html[data-theme='dark'] .afb-status[data-status='closed'] {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.12);
  color: #d1d5db;
}

html[data-theme='dark'] .afb-flash {
  background: rgba(21, 128, 61, 0.22);
  border-color: rgba(74, 222, 128, 0.3);
  color: #86efac;
}
</style>
