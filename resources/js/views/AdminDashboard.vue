<template>
  <main
    id="mainContent"
    class="admin-console"
    :class="{ 'has-bulkbar': selectedIds.length > 0 }"
    tabindex="-1"
    @keydown="onConsoleKeydown"
  >
    <div class="admin-console__shell">
      <div v-if="bootLoading" class="admin-console__state" role="status">
        <div class="admin-spinner" aria-hidden="true"></div>
        <span>{{ t('admin.loading') }}</span>
      </div>

      <div v-else-if="bootError" class="admin-console__state admin-console__state--error" role="alert">
        <span>{{ t('admin.load_error') }}</span>
        <button type="button" class="admin-btn" @click="boot(true)">{{ t('admin.retry') }}</button>
      </div>

      <div v-else-if="!data" class="admin-console__state" role="status">
        <span>{{ t('common.status.emptyDesc') }}</span>
        <button type="button" class="admin-btn" @click="boot(true)">{{ t('admin.retry') }}</button>
      </div>

      <template v-else>
        <header class="admin-console__top admin-reveal" style="--admin-delay: 0ms">
          <div class="admin-console__brand">
            <p class="admin-eyebrow">{{ t('admin.eyebrow') }}</p>
            <h1>{{ t('admin.greeting', { name: greetingName }) }}</h1>
            <div class="admin-rule" aria-hidden="true"></div>
            <p class="admin-supporting">{{ t('admin.supporting_message') }}</p>
          </div>
          <div class="admin-console__top-actions">
            <div class="admin-range" role="group" :aria-label="t('admin.days_range')">
              <button
                type="button"
                class="admin-btn admin-btn--ghost admin-btn--sm"
                :class="{ 'is-active': chartDays === 7 }"
                @click="setChartDays(7)"
              >
                {{ t('admin.days_7') }}
              </button>
              <button
                type="button"
                class="admin-btn admin-btn--ghost admin-btn--sm"
                :class="{ 'is-active': chartDays === 30 }"
                @click="setChartDays(30)"
              >
                {{ t('admin.days_30') }}
              </button>
            </div>
            <button
              type="button"
              class="admin-icon-btn"
              :disabled="refreshing"
              :aria-label="t('admin.refresh')"
              @click="refreshAll"
            >
              <i class="bi bi-arrow-clockwise" :class="{ 'is-spinning': refreshing }" aria-hidden="true"></i>
            </button>
          </div>
          <div class="admin-kpis" :aria-label="t('admin.snapshot_title')">
            <button
              v-for="(metric, index) in snapshotCards"
              :key="metric.key"
              type="button"
              class="admin-kpi admin-reveal"
              :class="metric.toneClass"
              :style="{ '--admin-delay': `${60 + index * 40}ms` }"
              :title="metric.tooltip || undefined"
              @click="onKpiClick(metric)"
            >
              <span class="admin-kpi__label">{{ metric.label }}</span>
              <strong class="admin-kpi__value">{{ metric.value }}</strong>
              <em v-if="metric.trendLabel" class="admin-kpi__trend" :data-dir="metric.trendDir">
                <i
                  class="bi"
                  :class="metric.trendDir === 'up' ? 'bi-arrow-up-short' : metric.trendDir === 'down' ? 'bi-arrow-down-short' : 'bi-dash'"
                  aria-hidden="true"
                ></i>
                {{ metric.trendLabel }}
              </em>
            </button>
          </div>
        </header>

        <!-- USERS -->
        <section ref="usersSection" class="admin-users admin-reveal" style="--admin-delay: 120ms" :aria-label="t('admin.users_title')">
          <header class="admin-users__header">
            <div class="admin-users__title-block">
              <p class="admin-eyebrow">{{ t('admin.learners_title') }}</p>
              <div class="admin-users__title-row">
                <h2 class="admin-users__title">{{ t('admin.users_title') }}</h2>
                <span class="admin-users__count">{{ usersTotal }}</span>
              </div>
              <p class="admin-users__subtitle">{{ t('admin.users_subtitle') }}</p>
            </div>
            <div class="admin-users__actions mobile-actions">
              <button type="button" class="admin-btn admin-btn--primary admin-users__action" @click="openCreateModal">
                <i class="bi bi-plus-lg" aria-hidden="true"></i>
                <span>{{ t('admin.add_user') }}</span>
              </button>
              <button type="button" class="admin-btn admin-btn--ghost admin-users__action" @click="exportVisibleUsersCsv">
                <i class="bi bi-download" aria-hidden="true"></i>
                <span>{{ t('admin.export_csv') }}</span>
              </button>
            </div>
          </header>

          <div class="admin-toolbar">
            <div class="admin-toolbar__row">
              <div class="admin-toolbar__search-wrap">
                <i class="bi bi-search admin-toolbar__search-icon" aria-hidden="true"></i>
                <input
                  ref="searchInput"
                  v-model.trim="filters.q"
                  type="search"
                  class="admin-toolbar__search"
                  :placeholder="t('admin.users_search')"
                  @input="onSearchInput"
                >
              </div>
              <div class="admin-toolbar__controls">
                <select
                  v-model="filters.activity"
                  class="admin-toolbar__select admin-toolbar__select--active"
                  :aria-label="t('admin.filter_last_active')"
                  @change="onFilterChange"
                >
                  <option value="">{{ t('admin.filter_all_time') }}</option>
                  <option value="today">{{ t('admin.filter_active_today') }}</option>
                  <option value="active_7d">{{ t('admin.filter_active_7d') }}</option>
                  <option value="active_30d">{{ t('admin.filter_active_30d') }}</option>
                  <option value="inactive_30d">{{ t('admin.filter_inactive_30d') }}</option>
                  <option value="never">{{ t('admin.filter_never') }}</option>
                </select>
                <select
                  v-model="filters.progress"
                  class="admin-toolbar__select admin-toolbar__select--progress"
                  :aria-label="t('admin.filter_progress_all')"
                  @change="onFilterChange"
                >
                  <option value="">{{ t('admin.filter_progress_all') }}</option>
                  <option value="has">{{ t('admin.filter_progress_has') }}</option>
                  <option value="none">{{ t('admin.filter_progress_none') }}</option>
                </select>
              <select
                v-model="sortKey"
                class="admin-toolbar__select admin-toolbar__select--sort"
                :aria-label="t('admin.sort_last_active')"
                @change="onFilterChange"
              >
                <option value="last_active">{{ t('admin.sort_last_active') }}</option>
                <option value="sessions">{{ t('admin.sort_sessions') }}</option>
                <option value="memorised">{{ t('admin.sort_memorised') }}</option>
                <option value="learning">{{ t('admin.sort_learning') }}</option>
              </select>
                <button
                  type="button"
                  class="admin-toolbar__sort-dir"
                  :aria-pressed="sortDir === 'asc' ? 'true' : 'false'"
                  :aria-label="sortDir === 'asc' ? t('admin.sort_asc') : t('admin.sort_desc')"
                  @click="toggleSortDir"
                >
                  <i
                    class="bi"
                    :class="sortDir === 'asc' ? 'bi-sort-up' : 'bi-sort-down'"
                    aria-hidden="true"
                  ></i>
                  <span>{{ sortDir === 'asc' ? t('admin.sort_asc') : t('admin.sort_desc') }}</span>
                </button>
                <button
                  v-if="activeFilterCount > 0"
                  type="button"
                  class="admin-filter-badge"
                  @click="clearFilters"
                >
                  <span>{{ t('admin.filters_active_count', { n: activeFilterCount }) }}</span>
                  <i class="bi bi-x" aria-hidden="true"></i>
                </button>
              </div>
            </div>
            <p class="admin-results-count">
              <template v-if="filtersActive">
                {{ t('admin.showing_x_of_y_filtered', { shown: users.length, total: usersTotal }) }}
              </template>
              <template v-else>
                {{ t('admin.showing_x_of_y', { shown: users.length, total: usersTotal }) }}
              </template>
            </p>
          </div>

          <p v-if="usersLoading" class="admin-empty">{{ t('admin.drawer_loading') }}</p>
          <p v-else-if="usersError" class="admin-empty" role="alert">{{ t('admin.drawer_load_error') }}</p>
          <div v-else-if="!users.length" class="admin-users-empty" role="status">
            <i
              class="bi admin-users-empty__icon"
              :class="filtersActive ? 'bi-search' : 'bi-people'"
              aria-hidden="true"
            ></i>
            <p class="admin-users-empty__title">
              {{ filtersActive ? t('admin.users_empty_search') : t('admin.learners_empty') }}
            </p>
            <button
              v-if="filtersActive"
              type="button"
              class="admin-btn admin-btn--ghost admin-btn--sm"
              @click="clearFilters"
            >
              {{ t('admin.clear_filters') }}
            </button>
          </div>
          <div v-else class="admin-users-list">
            <ul class="admin-user-cards" role="list" :aria-label="t('admin.users_title')">
              <li
                v-for="row in users"
                :key="`card-${row.id}`"
                class="admin-user-card"
                :class="{
                  'is-selected': selectedUserId === row.id,
                  'is-expanded': isCardExpanded(row.id),
                }"
              >
                <div class="admin-user-card__row">
                  <label class="admin-user-card__check" @click.stop>
                    <input
                      type="checkbox"
                      :checked="selectedIds.includes(row.id)"
                      :aria-label="row.name || t('admin.unnamed')"
                      @change="toggleSelect(row.id)"
                    >
                  </label>
                  <button
                    type="button"
                    class="admin-user-card__main"
                    :aria-expanded="isCardExpanded(row.id) ? 'true' : 'false'"
                    :aria-controls="`admin-user-card-details-${row.id}`"
                    :aria-label="isCardExpanded(row.id) ? t('admin.card_collapse') : t('admin.card_expand')"
                    @click="toggleCardExpand(row.id)"
                  >
                    <div class="admin-user-card__top">
                      <div class="admin-user-card__who">
                        <strong :title="row.name || t('admin.unnamed')">{{ row.name || t('admin.unnamed') }}</strong>
                        <span class="admin-user-card__email" :title="row.email">{{ row.email }}</span>
                      </div>
                      <i
                        class="bi bi-chevron-down admin-user-card__chevron"
                        aria-hidden="true"
                      ></i>
                    </div>
                    <div class="admin-user-card__pills">
                      <span
                        class="admin-user-card__pill"
                        :class="{ 'is-empty': !Number(row.sessions_completed) }"
                      >
                        {{ sessionsPill(row) }}
                      </span>
                    </div>
                    <div class="admin-user-card__footer">
                      <span
                        class="admin-user-card__active"
                        :class="{ 'is-empty': !row.last_activity_at }"
                        :title="row.last_activity_at ? (formatDateShort(row.last_activity_at) || undefined) : undefined"
                      >
                        {{ lastActivePill(row) }}
                      </span>
                      <i
                        class="admin-status-dot"
                        :data-status="activityStatus(row)"
                        :title="activityStatusLabel(row)"
                        :aria-label="activityStatusLabel(row)"
                      ></i>
                    </div>
                  </button>
                </div>
                <div
                  :id="`admin-user-card-details-${row.id}`"
                  class="admin-user-card__details"
                >
                  <div class="admin-user-card__details-inner">
                    <div class="admin-user-card__metrics">
                      <div class="admin-user-card__metric" :class="{ 'is-empty': !Number(row.memorised_ayahs) }">
                        <span>{{ t('admin.col_memorised') }}</span>
                        <strong>{{ memorisedLabel(row.memorised_ayahs) }}</strong>
                      </div>
                      <div class="admin-user-card__metric" :class="{ 'is-empty': !Number(row.learning_ayahs) }">
                        <span>{{ t('admin.col_learning') }}</span>
                        <strong>{{ learningLabel(row.learning_ayahs) }}</strong>
                      </div>
                    </div>
                    <button
                      type="button"
                      class="admin-btn admin-btn--ghost admin-btn--sm admin-user-card__open"
                      @click="selectUser(row.id)"
                    >
                      {{ t('admin.card_view_details') }}
                    </button>
                  </div>
                </div>
              </li>
            </ul>

            <div class="admin-table-shell">
              <div class="admin-table-wrap" role="listbox" :aria-label="t('admin.users_title')">
                <table class="admin-table">
                  <colgroup>
                    <col class="admin-col-check">
                    <col class="admin-col-learner">
                    <col class="admin-col-num admin-col-memorised">
                    <col class="admin-col-num admin-col-sessions">
                    <col class="admin-col-num admin-col-learning">
                    <col class="admin-col-date">
                    <col class="admin-col-status">
                    <col class="admin-col-actions">
                  </colgroup>
                  <thead>
                    <tr>
                      <th class="admin-table__check">
                        <input
                          type="checkbox"
                          :checked="allVisibleSelected"
                          :aria-label="t('admin.select_all')"
                          @change="toggleSelectAll"
                        >
                      </th>
                      <th class="admin-table__learner">{{ t('admin.col_learner') }}</th>
                      <th>
                        <button type="button" class="admin-th-sort" :class="{ 'is-active': sortKey === 'memorised' }" @click="setSort('memorised')">
                          {{ t('admin.col_memorised') }}
                        </button>
                      </th>
                      <th>
                        <button type="button" class="admin-th-sort" :class="{ 'is-active': sortKey === 'sessions' }" @click="setSort('sessions')">
                          {{ t('admin.col_sessions') }}
                        </button>
                      </th>
                      <th>
                        <button type="button" class="admin-th-sort" :class="{ 'is-active': sortKey === 'learning' }" @click="setSort('learning')">
                          {{ t('admin.col_learning') }}
                        </button>
                      </th>
                      <th>
                        <button type="button" class="admin-th-sort" :class="{ 'is-active': sortKey === 'last_active' }" @click="setSort('last_active')">
                          {{ t('admin.col_active') }}
                        </button>
                      </th>
                      <th class="admin-table__status" :title="t('admin.col_status')">
                        <span class="visually-hidden">{{ t('admin.col_status') }}</span>
                      </th>
                      <th class="admin-table__actions"></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="row in users"
                      :key="row.id"
                      :class="{ 'is-selected': selectedUserId === row.id, 'has-menu-open': rowMenuId === row.id }"
                      tabindex="0"
                      @click="selectUser(row.id)"
                      @keydown.enter.prevent="selectUser(row.id)"
                    >
                      <td class="admin-table__check" @click.stop>
                        <input
                          type="checkbox"
                          :checked="selectedIds.includes(row.id)"
                          @change="toggleSelect(row.id)"
                        >
                      </td>
                      <td class="admin-table__learner">
                        <div class="admin-table__who">
                          <strong :title="row.name || t('admin.unnamed')">{{ row.name || t('admin.unnamed') }}</strong>
                          <span class="admin-table__email" :title="row.email">{{ row.email }}</span>
                        </div>
                      </td>
                      <td class="admin-num" :class="{ 'is-empty': !Number(row.memorised_ayahs) }">
                        {{ memorisedLabel(row.memorised_ayahs) }}
                      </td>
                      <td class="admin-num" :class="{ 'is-empty': !Number(row.sessions_completed) }">
                        {{ sessionsLabel(row.sessions_completed) }}
                      </td>
                      <td class="admin-num" :class="{ 'is-empty': !Number(row.learning_ayahs) }">
                        {{ learningLabel(row.learning_ayahs) }}
                      </td>
                      <td class="admin-num" :class="{ 'is-empty': !row.last_activity_at }">
                        <span :title="row.last_activity_at ? (formatDateShort(row.last_activity_at) || undefined) : undefined">
                          {{ lastActiveLabel(row.last_activity_at) }}
                        </span>
                      </td>
                      <td class="admin-table__status">
                        <i
                          class="admin-status-dot"
                          :data-status="activityStatus(row)"
                          :title="activityStatusLabel(row)"
                          :aria-label="activityStatusLabel(row)"
                        ></i>
                      </td>
                      <td class="admin-table__actions" @click.stop>
                        <div class="admin-row-menu" :class="{ 'is-open': rowMenuId === row.id }">
                          <button
                            type="button"
                            class="admin-row-menu__btn"
                            :aria-label="t('admin.row_actions')"
                            :aria-expanded="rowMenuId === row.id ? 'true' : 'false'"
                            @click="toggleRowMenu(row.id)"
                          >
                            <span aria-hidden="true">⋮</span>
                          </button>
                          <div v-if="rowMenuId === row.id" class="admin-row-menu__panel" role="menu">
                            <button type="button" role="menuitem" @click="askResetPassword(row)">
                              {{ t('admin.action_reset_password') }}
                            </button>
                            <a role="menuitem" :href="`mailto:${row.email}`" @click="rowMenuId = null">
                              {{ t('admin.action_send_email') }}
                            </a>
                            <button
                              type="button"
                              role="menuitem"
                              class="is-danger"
                              :disabled="Number(row.id) === ownerId || row.subscription_status === 'canceled'"
                              @click="askDeactivate(row)"
                            >
                              {{ t('admin.action_deactivate') }}
                            </button>
                            <button type="button" role="menuitem" @click="viewAsLearner">
                              {{ t('admin.action_view_as_learner') }}
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div v-if="usersTotal > 0" class="admin-pagination">
            <div class="admin-pagination__controls">
              <button
                type="button"
                class="admin-btn admin-btn--ghost admin-btn--sm"
                :disabled="usersPage <= 1 || usersLoading"
                @click="goToPage(usersPage - 1)"
              >
                {{ t('admin.pagination_prev') }}
              </button>
              <button
                v-for="page in pageNumbers"
                :key="page"
                type="button"
                class="admin-btn admin-btn--ghost admin-btn--sm admin-pagination__page"
                :class="{ 'is-active': page === usersPage }"
                :disabled="usersLoading"
                @click="goToPage(page)"
              >
                {{ page }}
              </button>
              <button
                type="button"
                class="admin-btn admin-btn--ghost admin-btn--sm"
                :disabled="usersPage >= usersTotalPages || usersLoading"
                @click="goToPage(usersPage + 1)"
              >
                {{ t('admin.pagination_next') }}
              </button>
            </div>
          </div>
        </section>
      </template>
    </div>

    <!-- User drawer (teleported to escape layout stacking) -->
    <Teleport to="body">
      <div
        v-if="drawerOpen && selectedUserId"
        class="admin-drawer-root"
        role="dialog"
        aria-modal="true"
        :aria-label="t('admin.drawer_user_title')"
      >
        <button type="button" class="admin-drawer__backdrop" :aria-label="t('admin.drawer_close')" @click="closeDrawer"></button>
        <aside class="admin-drawer">
          <header class="admin-drawer__head">
            <div class="admin-drawer__identity">
              <span class="admin-avatar" aria-hidden="true">{{ userInitials(detail?.user?.name || selectedListRow?.name) }}</span>
              <div class="admin-drawer__titles">
                <div class="admin-inline-field" :class="{ 'is-dirty': editFieldDirty('name') }">
                  <label class="admin-inline-field__label">
                    <span class="visually-hidden">{{ t('admin.field_name') }}</span>
                    <input
                      v-model.trim="editForm.name"
                      type="text"
                      maxlength="120"
                      class="admin-inline-field__input admin-inline-field__input--name"
                      @blur="onEditBlur"
                    >
                    <i class="bi bi-pencil admin-inline-field__icon" aria-hidden="true"></i>
                  </label>
                </div>
                <div class="admin-inline-field" :class="{ 'is-dirty': editFieldDirty('email') }">
                  <label class="admin-inline-field__label">
                    <span class="visually-hidden">{{ t('admin.field_email') }}</span>
                    <input
                      v-model.trim="editForm.email"
                      type="email"
                      maxlength="255"
                      class="admin-inline-field__input admin-inline-field__input--email"
                      @blur="onEditBlur"
                    >
                    <i class="bi bi-pencil admin-inline-field__icon" aria-hidden="true"></i>
                  </label>
                </div>
                <div class="admin-drawer__meta">
                  <i
                    class="admin-status-dot"
                    :data-status="activityStatus(detail?.user || selectedListRow || {})"
                    :title="activityStatusLabel(detail?.user || selectedListRow || {})"
                    :aria-label="activityStatusLabel(detail?.user || selectedListRow || {})"
                  ></i>
                  <span class="admin-drawer__status-label">{{ activityStatusLabel(detail?.user || selectedListRow || {}) }}</span>
                  <button
                    v-if="editFormDirty"
                    type="button"
                    class="admin-btn admin-btn--primary admin-btn--sm"
                    :disabled="formSaving"
                    @click="saveUser"
                  >
                    {{ formSaving ? t('admin.saving') : t('admin.save_user') }}
                  </button>
                </div>
                <p v-if="formError" class="admin-form__error" role="alert">{{ formError }}</p>
              </div>
            </div>
            <button type="button" class="admin-icon-btn admin-drawer__close" :aria-label="t('admin.drawer_close')" @click="closeDrawer">
              <i class="bi bi-x-lg" aria-hidden="true"></i>
            </button>
          </header>

          <div class="admin-drawer__scroll">
            <p v-if="detailLoading" class="admin-empty">{{ t('admin.drawer_loading') }}</p>
            <p v-else-if="detailError" class="admin-empty" role="alert">{{ t('admin.drawer_load_error') }}</p>
            <div v-else-if="detail" class="admin-drawer__body">
              <section class="admin-drawer-section">
                <div class="admin-drawer__quick" role="group" :aria-label="t('admin.row_actions')">
                  <button type="button" class="admin-quick-btn" @click="askResetPassword(detail.user || selectedListRow)">
                    <i class="bi bi-key" aria-hidden="true"></i>
                    <span>{{ t('admin.action_reset_password') }}</span>
                  </button>
                  <a class="admin-quick-btn" :href="`mailto:${detail.user?.email || selectedListRow?.email || ''}`">
                    <i class="bi bi-envelope" aria-hidden="true"></i>
                    <span>{{ t('admin.action_send_email') }}</span>
                  </a>
                </div>
                <div class="admin-drawer__quick admin-drawer__quick--danger" role="group" :aria-label="t('admin.danger_zone')">
                  <button
                    type="button"
                    class="admin-quick-btn admin-quick-btn--danger"
                    :disabled="isSelfSelected || (detail.user || selectedListRow)?.subscription_status === 'canceled'"
                    @click="askDeactivate(detail.user || selectedListRow)"
                  >
                    <i class="bi bi-pause-circle" aria-hidden="true"></i>
                    <span>{{ t('admin.action_deactivate') }}</span>
                  </button>
                  <button
                    type="button"
                    class="admin-quick-btn admin-quick-btn--danger"
                    :disabled="deletingUser || isSelfSelected"
                    @click="openDeleteModal"
                  >
                    <i class="bi bi-trash" aria-hidden="true"></i>
                    <span>{{ t('admin.delete_account') }}</span>
                  </button>
                </div>
              </section>

              <section class="admin-drawer-section">
                <div class="admin-statstrip">
                  <div
                    v-for="stat in detailStats"
                    :key="stat.key"
                    class="admin-statstrip__item"
                    :class="{ 'is-empty': stat.empty }"
                  >
                    <strong>{{ stat.value }}</strong>
                    <span>{{ stat.label }}</span>
                  </div>
                </div>
              </section>

              <section class="admin-drawer-section">
                <div class="admin-drawer-section__head">
                  <h3 class="admin-drawer-section__title">{{ t('admin.user_surahs') }}</h3>
                </div>
                <p v-if="!detail.surah_progress?.length" class="admin-muted">{{ t('admin.user_surahs_empty_soft') }}</p>
                <ul v-else class="admin-surah-list">
                  <li
                    v-for="row in detail.surah_progress"
                    :key="row.surah_number"
                    class="admin-surah-card"
                    :class="{ 'is-open': expandedSurah === row.surah_number }"
                  >
                    <button
                      type="button"
                      class="admin-surah-card__main"
                      :aria-expanded="expandedSurah === row.surah_number ? 'true' : 'false'"
                      :aria-label="expandedSurah === row.surah_number ? t('admin.user_surah_collapse') : t('admin.user_surah_expand')"
                      @click="toggleSurahExpand(row.surah_number)"
                    >
                      <div class="admin-surah-card__top">
                        <span class="admin-surah-card__name">{{ row.surah_name }}</span>
                        <span class="admin-surah-card__meta">
                          {{ t('admin.user_surah_fraction', { practised: row.practised, total: row.total_ayahs }) }}
                          · {{ t('admin.user_surah_percent', { n: row.percent }) }}
                        </span>
                        <i
                          class="bi bi-chevron-down admin-surah-card__chevron"
                          aria-hidden="true"
                        ></i>
                      </div>
                      <div
                        class="admin-surah-progress__track"
                        role="progressbar"
                        :aria-valuenow="row.percent"
                        aria-valuemin="0"
                        aria-valuemax="100"
                        :aria-label="row.surah_name"
                      >
                        <div
                          class="admin-surah-progress__fill"
                          :class="{ 'is-zero': !row.percent }"
                          :style="{ width: surahBarWidth(row) }"
                        ></div>
                      </div>
                    </button>
                    <div v-if="expandedSurah === row.surah_number" class="admin-surah-card__details">
                      <div class="admin-surah-card__stats">
                        <span>{{ t('admin.user_surah_memorised', { n: Number(row.memorised || 0) }) }}</span>
                        <span>{{ t('admin.user_surah_learning', { n: Number(row.in_progress || 0) }) }}</span>
                      </div>
                      <a
                        class="admin-surah-card__action"
                        :href="surahPracticeHref(row)"
                        target="_blank"
                        rel="noopener noreferrer"
                        @click.stop
                      >
                        <i class="bi bi-box-arrow-up-right" aria-hidden="true"></i>
                        <span>{{ t('admin.user_surah_open') }}</span>
                      </a>
                    </div>
                  </li>
                </ul>
              </section>

              <section class="admin-drawer-section admin-drawer-section--last">
                <div class="admin-drawer-section__head">
                  <h3 class="admin-drawer-section__title">{{ t('admin.user_activity') }}</h3>
                  <p class="admin-drawer-section__hint">{{ t('admin.user_activity_hint') }}</p>
                </div>
                <p v-if="!detailRecentActivity.length" class="admin-muted">{{ t('admin.user_activity_empty') }}</p>
                <ul v-else class="admin-session-list">
                  <li v-for="row in detailRecentActivity" :key="row.key">
                    <a
                      class="admin-activity-card"
                      :href="activityHref(row)"
                      target="_blank"
                      rel="noopener noreferrer"
                      :aria-label="activityActionLabel(row)"
                    >
                      <div class="admin-activity-card__body">
                        <div class="admin-session-list__line1">
                          <span
                            class="admin-session-list__kind"
                            :class="{ 'admin-session-list__kind--ai': row.kind === 'ai' }"
                          >
                            {{ row.kind === 'ai' ? t('admin.activity_type_ai') : t('admin.activity_type_session') }}
                          </span>
                          <span class="admin-activity-card__title">
                            {{ row.surah_name || '—' }}
                            <template v-if="formatItemRange(row)"> {{ formatItemRange(row) }}</template>
                          </span>
                        </div>
                        <div class="admin-session-list__line2">
                          <template v-if="row.kind === 'session'">
                            <span class="admin-outcome" :data-outcome="sessionOutcomeKey(row)">{{ sessionOutcomeLabel(row) }}</span>
                          </template>
                          <span
                            v-else-if="row.accuracy_percent != null"
                            class="admin-outcome"
                            :class="accuracyToneClass(row.accuracy_percent)"
                          >{{ t('admin.accuracy', { n: Number(row.accuracy_percent) }) }}</span>
                          <time>{{ formatDateShort(row.occurred_at) || formatRelative(row.occurred_at) }}</time>
                        </div>
                      </div>
                      <span class="admin-activity-card__cta">
                        <span>{{ activityActionLabel(row) }}</span>
                        <i class="bi bi-box-arrow-up-right" aria-hidden="true"></i>
                      </span>
                    </a>
                  </li>
                </ul>
              </section>
            </div>
          </div>
        </aside>
      </div>
    </Teleport>

    <!-- Create modal -->
    <div v-if="createOpen" class="admin-modal-root" role="dialog" aria-modal="true" :aria-label="t('admin.drawer_create_title')">
      <button type="button" class="admin-modal__backdrop" :aria-label="t('admin.drawer_close')" @click="createOpen = false"></button>
      <div class="admin-modal">
        <header class="admin-modal__head">
          <h2>{{ t('admin.drawer_create_title') }}</h2>
          <button type="button" class="admin-icon-btn" :aria-label="t('admin.drawer_close')" @click="createOpen = false">
            <i class="bi bi-x-lg" aria-hidden="true"></i>
          </button>
        </header>
        <form class="admin-form" @submit.prevent="createUser">
          <label>
            <span>{{ t('admin.field_name') }}</span>
            <input v-model.trim="createForm.name" type="text" required maxlength="120">
          </label>
          <label>
            <span>{{ t('admin.field_email') }}</span>
            <input v-model.trim="createForm.email" type="email" required maxlength="255">
          </label>
          <label>
            <span>{{ t('admin.field_subscription_tier') }}</span>
            <select v-model="createForm.subscription_tier">
              <option v-for="tier in tierOptions" :key="tier" :value="tier">
                {{ tierLabel(tier) }}
              </option>
            </select>
          </label>
          <label>
            <span>{{ t('admin.add_user_note') }}</span>
            <textarea v-model.trim="createForm.note" rows="3" maxlength="500"></textarea>
          </label>
          <p v-if="createError" class="admin-form__error" role="alert">{{ createError }}</p>
          <div class="admin-form__actions">
            <button type="button" class="admin-btn admin-btn--ghost" @click="createOpen = false">{{ t('admin.cancel') }}</button>
            <button type="submit" class="admin-btn admin-btn--primary" :disabled="createSaving">
              {{ createSaving ? t('admin.saving') : t('admin.create_user') }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Delete confirm modal -->
    <div v-if="deleteOpen" class="admin-modal-root" role="dialog" aria-modal="true" :aria-label="t('admin.delete_user')">
      <button type="button" class="admin-modal__backdrop" :aria-label="t('admin.drawer_close')" @click="closeDeleteModal"></button>
      <div class="admin-modal admin-modal--delete">
        <header class="admin-modal__head">
          <h2>{{ t('admin.delete_user') }}</h2>
          <button type="button" class="admin-icon-btn" :aria-label="t('admin.drawer_close')" @click="closeDeleteModal">
            <i class="bi bi-x-lg" aria-hidden="true"></i>
          </button>
        </header>
        <p class="admin-muted">{{ t('admin.delete_user_prompt', { name: deleteTargetName || t('admin.unnamed') }) }}</p>
        <label>
          <span>{{ t('admin.delete_type_name', { name: deleteTargetName }) }}</span>
          <input v-model.trim="deleteConfirmName" type="text" autocomplete="off">
        </label>
        <p v-if="formError" class="admin-form__error" role="alert">{{ formError }}</p>
        <div class="admin-form__actions">
          <button type="button" class="admin-btn admin-btn--ghost" @click="closeDeleteModal">{{ t('admin.cancel') }}</button>
          <button
            type="button"
            class="admin-btn admin-btn--danger"
            :disabled="deletingUser || !deleteConfirmReady"
            @click="confirmDeleteUser"
          >
            {{ deletingUser ? t('admin.saving') : t('admin.delete_user') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Action confirm modal (reset / deactivate) -->
    <div v-if="confirmOpen" class="admin-modal-root" role="dialog" aria-modal="true" :aria-label="confirmTitle">
      <button type="button" class="admin-modal__backdrop" :aria-label="t('admin.drawer_close')" @click="closeConfirmModal"></button>
      <div class="admin-modal">
        <header class="admin-modal__head">
          <h2>{{ confirmTitle }}</h2>
          <button type="button" class="admin-icon-btn" :aria-label="t('admin.drawer_close')" @click="closeConfirmModal">
            <i class="bi bi-x-lg" aria-hidden="true"></i>
          </button>
        </header>
        <p class="admin-muted">{{ confirmMessage }}</p>
        <div class="admin-form__actions">
          <button type="button" class="admin-btn admin-btn--ghost" @click="closeConfirmModal">{{ t('admin.cancel') }}</button>
          <button
            type="button"
            class="admin-btn"
            :class="confirmKind === 'deactivate' ? 'admin-btn--danger' : 'admin-btn--primary'"
            :disabled="confirmBusy"
            @click="runConfirmAction"
          >
            {{ confirmBusy ? t('admin.saving') : confirmTitle }}
          </button>
        </div>
      </div>
    </div>

    <!-- Floating bulk actions (fixed; kept in console for theme tokens) -->
    <Transition name="admin-bulkbar">
      <div
        v-if="selectedIds.length"
        class="admin-bulkbar-float"
        role="toolbar"
        :aria-label="t('admin.bulk_selected', { n: selectedIds.length })"
      >
        <div class="admin-bulkbar-float__inner">
          <span class="admin-bulkbar-float__count">
            {{ t('admin.bulk_selected', { n: selectedIds.length }) }}
          </span>
          <div class="admin-bulkbar-float__actions">
            <button
              type="button"
              class="admin-btn admin-btn--sm admin-bulkbar-float__btn"
              :disabled="bulkBusy"
              @click="bulkSendEmail"
            >
              {{ t('admin.bulk_message_selected') }}
            </button>
            <div class="admin-bulkbar-float__sub">
              <select
                v-model="bulkStatus"
                class="admin-toolbar__select admin-bulkbar-float__select"
                :aria-label="t('admin.bulk_change_subscription')"
              >
                <option v-for="status in subscriptionOptions" :key="status" :value="status">
                  {{ subscriptionLabel(status) }}
                </option>
              </select>
              <button
                type="button"
                class="admin-btn admin-btn--sm admin-bulkbar-float__btn"
                :disabled="bulkBusy"
                @click="runBulkStatus"
              >
                {{ t('admin.bulk_change_subscription') }}
              </button>
            </div>
            <button
              type="button"
              class="admin-btn admin-btn--danger admin-btn--sm admin-bulkbar-float__btn"
              :disabled="bulkBusy"
              @click="bulkDeactivate"
            >
              {{ t('admin.bulk_deactivate_short') }}
            </button>
            <button
              type="button"
              class="admin-btn admin-btn--sm admin-bulkbar-float__btn"
              :disabled="bulkBusy"
              @click="exportSelectedCsv"
            >
              {{ t('admin.bulk_export_selected') }}
            </button>
          </div>
          <button
            type="button"
            class="admin-bulkbar-float__close"
            :aria-label="t('admin.bulk_dismiss')"
            @click="selectedIds = []"
          >
            <i class="bi bi-x-lg" aria-hidden="true"></i>
          </button>
        </div>
      </div>
    </Transition>

    <!-- Toast -->
    <div v-if="toastMessage" class="admin-toast" role="status" aria-live="polite">
      {{ toastMessage }}
    </div>
  </main>
</template>

<script>
import { adminApi } from '../scripts/api/admin'
import './AdminDashboard.css'

const emptyEdit = () => ({
  name: '',
  email: '',
  subscription_status: 'none',
})

const emptyCreate = () => ({
  name: '',
  email: '',
  subscription_tier: 'none',
  note: '',
})

export default {
  name: 'AdminDashboard',
  props: {
    auth: { type: Object, default: () => ({}) },
    initialData: { type: Object, default: null },
  },
  data() {
    const initial = this.sanitizePayload(this.initialData)
    return {
      data: initial,
      bootLoading: !initial,
      bootError: false,
      refreshing: false,
      chartDays: Number(initial?.meta?.chart_days) === 7 ? 7 : 30,
      users: [],
      usersTotal: 0,
      usersPage: 1,
      usersPerPage: 25,
      usersTotalPages: 1,
      usersLoading: false,
      usersError: false,
      usersRequestId: 0,
      searchTimer: null,
      filters: { q: '', activity: '', progress: '' },
      sortKey: 'last_active',
      sortDir: 'desc',
      rowMenuId: null,
      selectedUserId: null,
      selectedIds: [],
      bulkStatus: 'active',
      bulkBusy: false,
      detail: null,
      detailLoading: false,
      detailError: false,
      detailRequestId: 0,
      detailCache: {},
      expandedSurah: null,
      expandedCardIds: {},
      editForm: emptyEdit(),
      editFormBaseline: emptyEdit(),
      formSaving: false,
      formError: '',
      deletingUser: false,
      drawerOpen: false,
      createOpen: false,
      createForm: emptyCreate(),
      createSaving: false,
      createError: '',
      deleteOpen: false,
      deleteConfirmName: '',
      confirmOpen: false,
      confirmKind: '',
      confirmRow: null,
      confirmBusy: false,
      toastMessage: '',
      toastTimer: null,
      subscriptionOptions: ['none', 'trialing', 'active', 'canceled', 'past_due'],
      tierOptions: ['none', 'free', 'pro'],
    }
  },
  computed: {
    ownerId() {
      return Number(this.auth?.id || 0)
    },
    greetingName() {
      const name = String(this.auth?.name || this.data?.meta?.greeting_name || '').trim()
      return name || this.t('admin.dear_friend')
    },
    isSelfSelected() {
      return !!this.selectedUserId && Number(this.selectedUserId) === this.ownerId
    },
    contactInboxUrl() {
      return this.auth?.contact_inbox_url || this.data?.contacts?.view_all_href || '/admin/contact-messages'
    },
    snapshotCards() {
      const snapshot = this.data?.snapshot || {}
      const usersTotal = Number(snapshot.users_total?.value || 0)
      const activeShare = Number(snapshot.active_users?.share_of_users ?? (
        usersTotal > 0 ? (Number(snapshot.active_users?.value || 0) / usersTotal) * 100 : 0
      ))
      let activeTone = 'admin-kpi--active-mid'
      if (activeShare >= 50) activeTone = 'admin-kpi--active-high'
      else if (activeShare < 10) activeTone = 'admin-kpi--active-low'

      return [
        {
          key: 'users_total',
          label: this.t('admin.metric_users'),
          value: usersTotal,
          action: 'users',
          toneClass: 'admin-kpi--users',
          trendLabel: this.formatTrend(snapshot.users_total?.trend_percent),
          trendDir: this.trendDir(snapshot.users_total?.trend_percent),
        },
        {
          key: 'active_users',
          label: this.t('admin.metric_active'),
          value: Number(snapshot.active_users?.value || 0),
          action: 'users_active',
          toneClass: activeTone,
          trendLabel: this.formatTrend(snapshot.active_users?.trend_percent),
          trendDir: this.trendDir(snapshot.active_users?.trend_percent),
        },
        {
          key: 'memorised_ayahs',
          label: this.t('admin.metric_memorised'),
          value: Number(snapshot.memorised_ayahs?.value || 0),
          action: 'users',
          toneClass: 'admin-kpi--memorised',
          trendLabel: this.formatTrend(snapshot.memorised_ayahs?.trend_percent),
          trendDir: this.trendDir(snapshot.memorised_ayahs?.trend_percent),
        },
        {
          key: 'sessions_completed',
          label: this.t('admin.metric_sessions'),
          value: Number(snapshot.sessions_completed?.value || 0),
          action: 'users',
          toneClass: 'admin-kpi--sessions',
          trendLabel: this.formatTrend(snapshot.sessions_completed?.trend_percent),
          trendDir: this.trendDir(snapshot.sessions_completed?.trend_percent),
        },
      ]
    },
    allVisibleSelected() {
      return this.users.length > 0 && this.users.every((row) => this.selectedIds.includes(row.id))
    },
    filtersActive() {
      return this.activeFilterCount > 0
    },
    activeFilterCount() {
      let count = 0
      if (this.filters.q) count += 1
      if (this.filters.activity) count += 1
      if (this.filters.progress) count += 1
      if (this.sortKey !== 'last_active' || this.sortDir !== 'desc') count += 1
      return count
    },
    selectedListRow() {
      if (!this.selectedUserId) return null
      return this.users.find((row) => Number(row.id) === Number(this.selectedUserId)) || null
    },
    detailStats() {
      const listRow = this.selectedListRow
      const stats = this.detail?.stats || {}
      const user = this.detail?.user || {}
      const memorised = Number(
        listRow?.memorised_ayahs ?? stats.memorised_ayahs ?? user.memorised_ayahs ?? 0
      )
      const sessions = Number(
        listRow?.sessions_completed ?? stats.sessions_completed ?? user.sessions_completed ?? 0
      )
      const aiChecks = Number(listRow?.ai_checks ?? stats.ai_checks ?? user.ai_checks ?? 0)
      const accuracy = listRow?.avg_ai_accuracy ?? stats.avg_ai_accuracy ?? user.avg_ai_accuracy ?? null
      return [
        { key: 's', value: this.sessionsLabel(sessions), label: this.t('admin.col_sessions'), empty: sessions <= 0 },
        { key: 'm', value: this.memorisedLabel(memorised), label: this.t('admin.col_memorised'), empty: memorised <= 0 },
        { key: 'ai', value: aiChecks > 0 ? aiChecks : this.t('admin.empty_ai_checks'), label: this.t('admin.chart_ai'), empty: aiChecks <= 0 },
        {
          key: 'acc',
          value: accuracy != null ? this.t('admin.accuracy', { n: Number(accuracy) }) : this.t('admin.empty_accuracy'),
          label: this.t('admin.col_accuracy'),
          empty: accuracy == null,
        },
      ]
    },
    detailRecentActivity() {
      const sessions = (this.detail?.recent_sessions || []).map((row) => ({
        ...row,
        kind: 'session',
        key: `s-${row.id}`,
      }))
      const aiChecks = (this.detail?.recent_ai_checks || []).map((row) => ({
        ...row,
        kind: 'ai',
        key: `a-${row.id}`,
      }))
      return [...sessions, ...aiChecks]
        .sort((a, b) => {
          const aTime = Date.parse(a.occurred_at || '') || 0
          const bTime = Date.parse(b.occurred_at || '') || 0
          return bTime - aTime
        })
        .slice(0, 4)
    },
    confirmTitle() {
      if (this.confirmKind === 'reset') return this.t('admin.action_reset_password')
      if (this.confirmKind === 'deactivate') return this.t('admin.action_deactivate')
      return ''
    },
    confirmMessage() {
      const email = this.confirmRow?.email || ''
      if (this.confirmKind === 'reset') {
        return this.t('admin.action_reset_password_confirm', { email })
      }
      if (this.confirmKind === 'deactivate') {
        return this.t('admin.action_deactivate_confirm', { email })
      }
      return ''
    },
    editFormDirty() {
      const baseline = this.editFormBaseline
      return (
        this.editForm.name !== baseline.name
        || this.editForm.email !== baseline.email
        || this.editForm.subscription_status !== baseline.subscription_status
      )
    },
    deleteTargetName() {
      return this.detail?.user?.name || this.selectedListRow?.name || ''
    },
    deleteConfirmReady() {
      const target = this.deleteTargetName
      return target !== '' && this.deleteConfirmName === target
    },
    pageNumbers() {
      const total = this.usersTotalPages
      const current = this.usersPage
      if (total <= 7) {
        return Array.from({ length: total }, (_, index) => index + 1)
      }
      let start = Math.max(1, current - 3)
      let end = Math.min(total, start + 6)
      start = Math.max(1, end - 6)
      return Array.from({ length: end - start + 1 }, (_, index) => start + index)
    },
  },
  mounted() {
    this.boot()
    document.addEventListener('click', this.onDocumentClick)
    document.addEventListener('keydown', this.onDocumentKeydown)
  },
  beforeUnmount() {
    if (this.searchTimer) clearTimeout(this.searchTimer)
    if (this.toastTimer) clearTimeout(this.toastTimer)
    document.removeEventListener('click', this.onDocumentClick)
    document.removeEventListener('keydown', this.onDocumentKeydown)
  },
  methods: {
    sanitizePayload(payload) {
      if (!payload || typeof payload !== 'object') return null
      const owner = Number(payload?.meta?.owner_id || 0)
      if (this.ownerId && owner && owner !== this.ownerId) return null
      return payload
    },
    async boot(force = false) {
      this.bootLoading = !this.data || force
      this.bootError = false
      try {
        if (!this.data || force) {
          const payload = await adminApi.getDashboard(this.chartDays)
          const sanitized = this.sanitizePayload(payload)
          if (!sanitized) throw new Error('owner mismatch')
          this.data = sanitized
          this.chartDays = Number(sanitized?.meta?.chart_days) === 7 ? 7 : 30
        }
        await this.reloadUsers()
      } catch (error) {
        console.error(error)
        if (!this.data) this.bootError = true
      } finally {
        this.bootLoading = false
      }
    },
    async refreshAll() {
      this.refreshing = true
      try {
        const payload = await adminApi.getDashboard(this.chartDays)
        const sanitized = this.sanitizePayload(payload)
        if (sanitized) {
          this.data = sanitized
          this.chartDays = Number(sanitized?.meta?.chart_days) === 7 ? 7 : 30
        }
        await this.reloadUsers()
        if (this.selectedUserId) {
          delete this.detailCache[this.selectedUserId]
          await this.loadDetail(this.selectedUserId)
        }
      } finally {
        this.refreshing = false
      }
    },
    onKpiClick(metric) {
      if (metric.action === 'inbox' && this.contactInboxUrl) {
        window.location.href = this.contactInboxUrl
        return
      }
      if (metric.action === 'users_active') {
        this.filters.activity = 'active_7d'
        this.usersPage = 1
        this.reloadUsers()
      } else if (metric.action === 'users') {
        this.clearFilters()
      }
      this.$nextTick(() => {
        const el = this.$refs.usersSection
        if (el && typeof el.scrollIntoView === 'function') {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      })
    },
    onFilterChange() {
      this.usersPage = 1
      this.reloadUsers()
    },
    onSearchInput() {
      if (this.searchTimer) clearTimeout(this.searchTimer)
      this.searchTimer = setTimeout(() => {
        this.usersPage = 1
        this.reloadUsers()
      }, 220)
    },
    toggleSortDir() {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc'
      this.usersPage = 1
      this.reloadUsers()
    },
    setSort(key) {
      if (this.sortKey === key) {
        this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc'
      } else {
        this.sortKey = key
        this.sortDir = 'desc'
      }
      this.usersPage = 1
      this.reloadUsers()
    },
    clearFilters() {
      this.filters = { q: '', activity: '', progress: '' }
      this.sortKey = 'last_active'
      this.sortDir = 'desc'
      this.usersPage = 1
      this.reloadUsers()
    },
    async setChartDays(days) {
      const next = days === 7 ? 7 : 30
      if (this.chartDays === next && this.data?.top_learners) return
      this.chartDays = next
      this.refreshing = true
      try {
        const payload = await adminApi.getDashboard(next)
        const sanitized = this.sanitizePayload(payload)
        if (sanitized) this.data = sanitized
      } finally {
        this.refreshing = false
      }
    },
    formatTrend(value) {
      if (value == null || Number.isNaN(Number(value))) return ''
      const n = Number(value)
      const arrow = n > 0 ? '↑' : n < 0 ? '↓' : '→'
      const abs = Math.abs(n)
      const shown = Number.isInteger(abs) ? String(abs) : abs.toFixed(1)
      return this.t('admin.trend_vs_last_week', { arrow, n: shown })
    },
    trendDir(value) {
      if (value == null || Number.isNaN(Number(value))) return ''
      const n = Number(value)
      if (n > 0) return 'up'
      if (n < 0) return 'down'
      return 'flat'
    },
    activityStatus(row) {
      const at = row?.last_activity_at
      if (!at) return 'inactive'
      const date = new Date(at)
      if (Number.isNaN(date.getTime())) return 'inactive'
      const days = (Date.now() - date.getTime()) / 86400000
      if (days <= 7) return 'hot'
      if (days <= 30) return 'warm'
      return 'inactive'
    },
    activityStatusLabel(row) {
      const at = row?.last_activity_at
      if (!at) return this.t('admin.status_never_sessioned')
      const date = new Date(at)
      if (Number.isNaN(date.getTime())) return this.t('admin.status_never_sessioned')
      const days = Math.floor((Date.now() - date.getTime()) / 86400000)
      if (days <= 0) return this.t('admin.status_active_today')
      return this.t('admin.status_active_n_days_ago', { n: days })
    },
    accuracyToneClass(value) {
      const n = Number(value)
      if (Number.isNaN(n)) return ''
      if (n >= 80) return 'admin-acc--high'
      if (n >= 60) return 'admin-acc--mid'
      return 'admin-acc--low'
    },
    sessionOutcomeKey(row) {
      const status = String(row?.status || '').toLowerCase()
      if (status === 'completed') return 'completed'
      if (status === 'paused') return 'paused'
      return 'incomplete'
    },
    toggleSurahExpand(surahNumber) {
      const num = Number(surahNumber)
      this.expandedSurah = this.expandedSurah === num ? null : num
    },
    isCardExpanded(id) {
      return !!this.expandedCardIds[String(id)]
    },
    toggleCardExpand(id) {
      const key = String(id)
      const next = { ...this.expandedCardIds }
      if (next[key]) delete next[key]
      else next[key] = true
      this.expandedCardIds = next
    },
    memorisationHref({ surah, from, to, aiCheck = false, resume = false, sessionId = null } = {}) {
      const params = new URLSearchParams()
      if (surah) params.set('surah', String(surah))
      if (from) params.set('from', String(from))
      if (to) params.set('to', String(to))
      if (aiCheck) params.set('ai_check', '1')
      if (resume && sessionId) {
        params.set('resume', '1')
        params.set('session', String(sessionId))
      }
      if (!from && !to && surah && !resume) {
        params.set('setup', '1')
      }
      params.set('return', 'dashboard')
      const query = params.toString()
      return query ? `/memorisation?${query}` : '/memorisation'
    },
    surahPracticeHref(row) {
      const surah = Number(row?.surah_number || 0)
      const total = Number(row?.total_ayahs || 0)
      return this.memorisationHref({
        surah,
        from: total > 0 ? 1 : null,
        to: total > 0 ? total : null,
      })
    },
    activityHref(row) {
      const surah = Number(row?.surah_number || 0)
      const from = Number(row?.ayah_start || 0) || null
      const to = Number(row?.ayah_end || row?.ayah_start || 0) || null
      if (row?.kind === 'session' && String(row?.status || '').toLowerCase() === 'paused' && row?.id) {
        return this.memorisationHref({
          surah,
          from,
          to,
          resume: true,
          sessionId: row.id,
        })
      }
      return this.memorisationHref({
        surah,
        from,
        to,
        aiCheck: row?.kind === 'ai',
      })
    },
    activityActionLabel(row) {
      if (row?.kind === 'ai') return this.t('admin.user_activity_open_ai')
      if (String(row?.status || '').toLowerCase() === 'paused') return this.t('admin.user_activity_resume')
      return this.t('admin.user_activity_open_practice')
    },
    truncateId(id) {
      const text = String(id || '')
      if (text.length <= 10) return text
      return `${text.slice(0, 6)}…${text.slice(-2)}`
    },
    async copyUserId(id) {
      const text = String(id || '')
      if (!text) return
      try {
        if (navigator?.clipboard?.writeText) {
          await navigator.clipboard.writeText(text)
        } else {
          const input = document.createElement('input')
          input.value = text
          document.body.appendChild(input)
          input.select()
          document.execCommand('copy')
          document.body.removeChild(input)
        }
        this.showToast(this.t('admin.copied'))
      } catch (error) {
        this.showToast(this.t('admin.form_error'))
      }
    },
    goToPage(page) {
      const next = Math.max(1, Math.min(this.usersTotalPages, Number(page) || 1))
      if (next === this.usersPage) return
      this.usersPage = next
      this.reloadUsers()
    },
    showToast(message) {
      if (this.toastTimer) clearTimeout(this.toastTimer)
      this.toastMessage = message
      this.toastTimer = setTimeout(() => {
        this.toastMessage = ''
        this.toastTimer = null
      }, 2500)
    },
    viewAsLearner() {
      this.rowMenuId = null
      window.open('/dashboard', '_blank')
    },
    async exportVisibleUsersCsv() {
      try {
        const result = await adminApi.getUsers({
          page: 1,
          per_page: Math.min(500, Math.max(this.usersTotal || 25, 25)),
          q: this.filters.q,
          activity: this.filters.activity,
          progress: this.filters.progress,
          sort: this.sortKey,
          dir: this.sortDir,
        })
        const rows = result.users || []
        const headers = [
          'name', 'email', 'subscription_status', 'sessions_completed',
          'memorised_ayahs', 'learning_ayahs', 'last_activity_at',
        ]
        const escape = (value) => `"${String(value == null ? '' : value).replace(/"/g, '""')}"`
        const lines = [
          headers.join(','),
          ...rows.map((row) => headers.map((key) => escape(row[key])).join(',')),
        ]
        const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        const suffix = this.filtersActive ? 'filtered' : 'all'
        link.href = url
        link.download = `mutqin-users-${suffix}-${rows.length}.csv`
        link.click()
        URL.revokeObjectURL(url)
      } catch (error) {
        this.showToast(this.formErrorFrom(error))
      }
    },
    toggleRowMenu(id) {
      const num = Number(id)
      this.rowMenuId = this.rowMenuId === num ? null : num
    },
    onDocumentClick(event) {
      if (!this.rowMenuId) return
      const target = event.target
      if (target && typeof target.closest === 'function' && target.closest('.admin-row-menu')) return
      this.rowMenuId = null
    },
    onDocumentKeydown(event) {
      if (event.key !== 'Escape') return
      if (this.confirmOpen) {
        this.closeConfirmModal()
        return
      }
      if (this.deleteOpen) {
        this.closeDeleteModal()
        return
      }
      if (this.createOpen) {
        this.createOpen = false
        return
      }
      if (this.drawerOpen) {
        this.closeDrawer()
        return
      }
      this.rowMenuId = null
    },
    askResetPassword(row) {
      this.rowMenuId = null
      if (!row?.id) return
      this.confirmKind = 'reset'
      this.confirmRow = row
      this.confirmOpen = true
    },
    askDeactivate(row) {
      this.rowMenuId = null
      if (!row?.id || Number(row.id) === this.ownerId) return
      this.confirmKind = 'deactivate'
      this.confirmRow = row
      this.confirmOpen = true
    },
    closeConfirmModal() {
      if (this.confirmBusy) return
      this.confirmOpen = false
      this.confirmKind = ''
      this.confirmRow = null
    },
    async runConfirmAction() {
      if (!this.confirmRow?.id || !this.confirmKind) return
      this.confirmBusy = true
      try {
        if (this.confirmKind === 'reset') {
          await this.resetPassword(this.confirmRow)
        } else if (this.confirmKind === 'deactivate') {
          await this.deactivateAccount(this.confirmRow)
        }
        this.confirmOpen = false
        this.confirmKind = ''
        this.confirmRow = null
      } finally {
        this.confirmBusy = false
      }
    },
    async resetPassword(row) {
      if (!row?.id) return
      const password = this.generateTempPassword()
      try {
        await adminApi.updateUser(row.id, { password })
        this.showToast(this.t('admin.action_reset_password_done', { password }))
      } catch (error) {
        this.showToast(this.formErrorFrom(error))
      }
    },
    async deactivateAccount(row) {
      if (!row?.id || Number(row.id) === this.ownerId) return
      try {
        await adminApi.updateUser(row.id, { subscription_status: 'canceled' })
        await this.reloadUsers()
        if (this.selectedUserId === row.id) {
          delete this.detailCache[row.id]
          await this.loadDetail(row.id)
        }
        this.showToast(this.t('admin.toast_saved'))
      } catch (error) {
        this.showToast(this.formErrorFrom(error))
      }
    },
    userInitials(name) {
      const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
      if (!parts.length) return '?'
      if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
      return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase()
    },
    editFieldDirty(field) {
      return this.editForm[field] !== this.editFormBaseline[field]
    },
    onEditBlur() {
      if (!this.editFormDirty || this.formSaving) return
      if (!this.editForm.name || !this.editForm.email) return
      this.saveUser()
    },
    sessionOutcomeLabel(row) {
      const status = String(row?.status || '').toLowerCase()
      if (status === 'completed') return this.t('admin.outcome_session_completed')
      if (status === 'paused') return this.t('admin.outcome_session_paused')
      return this.t('admin.outcome_session_incomplete')
    },
    tierLabel(tier) {
      const key = String(tier || 'none').toLowerCase()
      if (key === 'free') return this.t('admin.tier_free')
      if (key === 'pro') return this.t('admin.tier_pro')
      return this.t('admin.sub_none')
    },
    subscriptionBadgeLabel(row) {
      if (!row) return this.t('admin.sub_none')
      const status = String(row.subscription_status || '').toLowerCase()
      const tier = String(row.subscription_tier || '').toLowerCase()
      if (status === 'active' || status === 'trialing' || status === 'pro' || tier === 'pro') {
        return this.t('admin.tier_pro')
      }
      if (status === 'free' || tier === 'free') return this.t('admin.tier_free')
      if (status === 'canceled') return this.t('admin.sub_canceled')
      if (status === 'past_due') return this.t('admin.sub_past_due')
      return this.t('admin.sub_none')
    },
    generateTempPassword() {
      const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#'
      let out = ''
      const bytes = new Uint8Array(14)
      if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        crypto.getRandomValues(bytes)
      } else {
        for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256)
      }
      for (let i = 0; i < bytes.length; i += 1) {
        out += alphabet[bytes[i] % alphabet.length]
      }
      return out
    },
    async reloadUsers() {
      const requestId = ++this.usersRequestId
      this.usersLoading = true
      this.usersError = false
      try {
        const result = await adminApi.getUsers({
          page: this.usersPage,
          per_page: this.usersPerPage,
          limit: this.usersPerPage,
          q: this.filters.q,
          activity: this.filters.activity,
          progress: this.filters.progress,
          sort: this.sortKey,
          dir: this.sortDir,
        })
        if (requestId !== this.usersRequestId) return
        this.users = result.users
        this.usersTotal = result.total
        this.usersPage = result.page || this.usersPage
        this.usersPerPage = result.per_page || this.usersPerPage
        this.usersTotalPages = result.total_pages || 1
        this.selectedIds = this.selectedIds.filter((id) => this.users.some((row) => row.id === id))
        this.syncDetailStatsFromList()
      } catch (error) {
        if (requestId !== this.usersRequestId) return
        this.usersError = true
      } finally {
        if (requestId === this.usersRequestId) this.usersLoading = false
      }
    },
    syncDetailStatsFromList() {
      const row = this.selectedListRow
      if (!row || !this.detail) return
      const nextStats = {
        ...(this.detail.stats || {}),
        memorised_ayahs: Number(row.memorised_ayahs || 0),
        sessions_completed: Number(row.sessions_completed || 0),
        learning_ayahs: Number(row.learning_ayahs || 0),
        ai_checks: Number(row.ai_checks || 0),
        avg_ai_accuracy: row.avg_ai_accuracy ?? null,
      }
      const nextUser = {
        ...(this.detail.user || {}),
        memorised_ayahs: nextStats.memorised_ayahs,
        sessions_completed: nextStats.sessions_completed,
        learning_ayahs: nextStats.learning_ayahs,
        ai_checks: nextStats.ai_checks,
        avg_ai_accuracy: nextStats.avg_ai_accuracy,
        last_ai_check_at: row.last_ai_check_at ?? this.detail.user?.last_ai_check_at ?? null,
        last_activity_at: row.last_activity_at ?? this.detail.user?.last_activity_at ?? null,
      }
      this.detail = { ...this.detail, user: nextUser, stats: nextStats }
      if (this.selectedUserId && this.detailCache[this.selectedUserId]) {
        this.detailCache[this.selectedUserId] = this.detail
      }
    },
    toggleSelect(id) {
      if (this.selectedIds.includes(id)) {
        this.selectedIds = this.selectedIds.filter((row) => row !== id)
      } else {
        this.selectedIds = [...this.selectedIds, id]
      }
    },
    toggleSelectAll(event) {
      if (event?.target?.checked) {
        this.selectedIds = this.users.map((row) => row.id)
      } else {
        this.selectedIds = []
      }
    },
    selectedUsers() {
      const ids = new Set(this.selectedIds.map((id) => Number(id)))
      return this.users.filter((row) => ids.has(Number(row.id)))
    },
    bulkSendEmail() {
      const emails = this.selectedUsers()
        .map((row) => String(row.email || '').trim())
        .filter(Boolean)
      if (!emails.length) return
      window.location.href = `mailto:?bcc=${encodeURIComponent(emails.join(','))}`
    },
    exportSelectedCsv() {
      const rows = this.selectedUsers()
      if (!rows.length) return
      const headers = [
        'id', 'name', 'email', 'subscription_status', 'memorised_ayahs',
        'learning_ayahs', 'sessions_completed', 'last_activity_at',
      ]
      const escape = (value) => {
        const text = value == null ? '' : String(value)
        return `"${text.replace(/"/g, '""')}"`
      }
      const lines = [
        headers.join(','),
        ...rows.map((row) => headers.map((key) => escape(row[key])).join(',')),
      ]
      const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `mutqin-users-${rows.length}.csv`
      link.click()
      URL.revokeObjectURL(url)
    },
    async runBulkStatus() {
      if (!this.selectedIds.length) return
      this.bulkBusy = true
      try {
        await adminApi.bulkUsers({
          action: 'update_status',
          user_ids: this.selectedIds,
          subscription_status: this.bulkStatus,
        })
        this.selectedIds = []
        await this.reloadUsers()
        this.refreshSnapshotQuiet()
        if (this.selectedUserId) {
          delete this.detailCache[this.selectedUserId]
          await this.loadDetail(this.selectedUserId)
        }
        this.showToast(this.t('admin.toast_saved'))
      } finally {
        this.bulkBusy = false
      }
    },
    async bulkDeactivate() {
      if (!this.selectedIds.length) return
      const ids = this.selectedIds.filter((id) => Number(id) !== this.ownerId)
      if (!ids.length) {
        this.showToast(this.t('admin.bulk_deactivate_self_blocked'))
        return
      }
      if (!window.confirm(this.t('admin.bulk_deactivate_confirm', { n: ids.length }))) return
      this.bulkBusy = true
      try {
        await adminApi.bulkUsers({
          action: 'update_status',
          user_ids: ids,
          subscription_status: 'canceled',
        })
        this.selectedIds = []
        await this.reloadUsers()
        this.refreshSnapshotQuiet()
        if (this.selectedUserId) {
          delete this.detailCache[this.selectedUserId]
          await this.loadDetail(this.selectedUserId)
        }
        this.showToast(this.t('admin.toast_saved'))
      } finally {
        this.bulkBusy = false
      }
    },
    async refreshSnapshotQuiet() {
      try {
        const payload = await adminApi.getDashboard(7)
        const sanitized = this.sanitizePayload(payload)
        if (sanitized) this.data = sanitized
      } catch (error) {
        /* ignore */
      }
    },
    selectUser(id) {
      const num = Number(id)
      if (!num) return
      this.selectedUserId = num
      this.formError = ''
      this.drawerOpen = true
      this.loadDetail(num)
    },
    closeDrawer() {
      this.drawerOpen = false
      this.expandedSurah = null
    },
    async loadDetail(id) {
      this.expandedSurah = null
      if (this.detailCache[id]) {
        this.detail = this.detailCache[id]
        this.hydrateEditForm(this.detail.user)
        this.syncDetailStatsFromList()
        this.detailLoading = false
        this.detailError = false
        return
      }
      const requestId = ++this.detailRequestId
      this.detailLoading = true
      this.detailError = false
      try {
        const detail = await adminApi.getUser(id)
        if (requestId !== this.detailRequestId) return
        this.detail = detail
        this.detailCache[id] = detail
        this.hydrateEditForm(detail?.user)
        this.syncDetailStatsFromList()
      } catch (error) {
        if (requestId !== this.detailRequestId) return
        this.detailError = true
        this.detail = null
      } finally {
        if (requestId === this.detailRequestId) this.detailLoading = false
      }
    },
    hydrateEditForm(user = {}) {
      const form = {
        name: user.name || '',
        email: user.email || '',
        subscription_status: user.subscription_status || 'none',
      }
      this.editForm = { ...form }
      this.editFormBaseline = { ...form }
    },
    formErrorFrom(error) {
      const errors = error?.response?.data?.errors
      if (errors && typeof errors === 'object') {
        const first = Object.values(errors).flat()[0]
        if (first) return String(first)
      }
      return error?.response?.data?.message || this.t('admin.form_error')
    },
    async saveUser() {
      if (!this.selectedUserId || !this.editFormDirty) return
      this.formSaving = true
      this.formError = ''
      try {
        const payload = {
          name: this.editForm.name,
          email: this.editForm.email,
          subscription_status: this.editForm.subscription_status,
        }
        const result = await adminApi.updateUser(this.selectedUserId, payload)
        if (result?.detail) {
          this.detail = result.detail
          this.detailCache[this.selectedUserId] = result.detail
          this.hydrateEditForm(result.detail.user)
        }
        await this.reloadUsers()
        this.showToast(this.t('admin.toast_saved'))
      } catch (error) {
        this.formError = this.formErrorFrom(error)
      } finally {
        this.formSaving = false
      }
    },
    openDeleteModal() {
      if (!this.selectedUserId || this.isSelfSelected) return
      this.deleteConfirmName = ''
      this.formError = ''
      this.deleteOpen = true
    },
    closeDeleteModal() {
      this.deleteOpen = false
      this.deleteConfirmName = ''
      this.formError = ''
    },
    async confirmDeleteUser() {
      if (!this.selectedUserId || !this.deleteConfirmReady) return
      this.deletingUser = true
      this.formError = ''
      try {
        await adminApi.deleteUser(this.selectedUserId)
        delete this.detailCache[this.selectedUserId]
        this.selectedUserId = null
        this.detail = null
        this.drawerOpen = false
        this.closeDeleteModal()
        await this.reloadUsers()
        this.refreshSnapshotQuiet()
        this.showToast(this.t('admin.toast_deleted'))
      } catch (error) {
        this.formError = this.formErrorFrom(error)
      } finally {
        this.deletingUser = false
      }
    },
    async deleteNote(row) {
      if (!row?.id) return
      if (!window.confirm(this.t('admin.delete_note_confirm'))) return
      await adminApi.deleteNote(row.id)
      if (this.detail?.recent_notes) {
        this.detail.recent_notes = this.detail.recent_notes.filter((n) => n.id !== row.id)
      }
      if (this.detail?.stats) {
        this.detail.stats.notes = Math.max(0, Number(this.detail.stats.notes || 1) - 1)
      }
      if (this.selectedUserId) this.detailCache[this.selectedUserId] = this.detail
    },
    openCreateModal() {
      this.createOpen = true
      this.createError = ''
      this.createForm = emptyCreate()
    },
    async createUser() {
      this.createSaving = true
      this.createError = ''
      const password = this.generateTempPassword()
      const tier = String(this.createForm.subscription_tier || 'none').toLowerCase()
      const subscriptionStatus = tier === 'pro' ? 'active' : 'none'
      const subscriptionTier = tier === 'pro' ? 'pro' : (tier === 'free' ? 'free' : 'none')
      try {
        const created = await adminApi.createUser({
          name: this.createForm.name,
          email: this.createForm.email,
          subscription_status: subscriptionStatus,
          subscription_tier: subscriptionTier,
          password,
        })
        this.createOpen = false
        this.usersPage = 1
        await this.reloadUsers()
        if (created?.id) {
          this.users = [created, ...this.users.filter((row) => Number(row.id) !== Number(created.id))]
            .slice(0, this.usersPerPage)
          this.selectUser(created.id)
        }
        this.refreshSnapshotQuiet()
        this.showToast(this.t('admin.toast_created', { password }))
      } catch (error) {
        this.createError = this.formErrorFrom(error)
      } finally {
        this.createSaving = false
      }
    },
    jumpToUser(userId) {
      if (!userId) return
      this.selectUser(userId)
    },
    onConsoleKeydown(event) {
      if (this.createOpen || this.deleteOpen || this.confirmOpen || this.drawerOpen) return
      if (event.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) return
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
      if (!this.users.length) return
      event.preventDefault()
      const index = this.users.findIndex((row) => row.id === this.selectedUserId)
      const next = event.key === 'ArrowDown'
        ? Math.min(this.users.length - 1, (index < 0 ? -1 : index) + 1)
        : Math.max(0, (index < 0 ? 1 : index) - 1)
      this.selectUser(this.users[next].id)
    },
    subscriptionLabel(key) {
      const map = {
        active: 'sub_active',
        trialing: 'sub_trialing',
        canceled: 'sub_canceled',
        past_due: 'sub_past_due',
        none: 'sub_none',
        free: 'tier_free',
        pro: 'tier_pro',
      }
      const i18nKey = map[String(key || '').toLowerCase()] || null
      return i18nKey ? this.t(`admin.${i18nKey}`) : String(key || 'none')
    },
    subscriptionPillClass(rowOrKey) {
      if (rowOrKey && typeof rowOrKey === 'object') {
        const status = String(rowOrKey.subscription_status || '').toLowerCase()
        const tier = String(rowOrKey.subscription_tier || '').toLowerCase()
        const isPro = status === 'pro' || tier === 'pro' || status === 'active' || status === 'trialing'
        if (isPro && (status === 'active' || status === 'trialing')) return 'admin-pill--active-pro'
        if (isPro) return 'admin-pill--pro'
        if (status === 'free' || tier === 'free') return 'admin-pill--free'
        return 'admin-pill--none'
      }
      const status = String(rowOrKey || '').toLowerCase()
      if (status === 'active' || status === 'trialing') return 'admin-pill--active-pro'
      if (status === 'pro') return 'admin-pill--pro'
      if (status === 'free') return 'admin-pill--free'
      return 'admin-pill--none'
    },
    surahBarWidth(row) {
      const percent = Number(row?.percent || 0)
      if (percent <= 0) return '0%'
      return `${Math.max(percent, 2)}%`
    },
    noteLine(row) {
      return [row.surah_name, this.t('admin.ayah_n', { n: row.ayah_number })].filter(Boolean).join(' · ')
    },
    formatItemRange(item) {
      const start = Number(item?.ayah_start || item?.ayah_number || 0)
      const end = Number(item?.ayah_end || 0)
      if (start > 0 && end > 0 && start !== end) return this.t('admin.ayah_range', { start, end })
      if (start > 0) return this.t('admin.ayah_single', { n: start })
      return ''
    },
    formatDateShort(value) {
      if (!value) return ''
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return ''
      return date.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })
    },
    formatRelative(value) {
      if (!value) return ''
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return ''
      const minutes = Math.round((Date.now() - date.getTime()) / 60000)
      if (minutes < 1) return this.t('admin.just_now')
      if (minutes < 60) return this.t('admin.minutes_ago', { n: minutes })
      const hours = Math.round(minutes / 60)
      if (hours < 24) return this.t('admin.hours_ago', { n: hours })
      const days = Math.round(hours / 24)
      if (days === 1) return this.t('admin.yesterday')
      if (days < 8) return this.t('admin.days_ago', { n: days })
      return date.toLocaleDateString([], { day: 'numeric', month: 'short' })
    },
    memorisedLabel(value) {
      const n = Number(value || 0)
      return n > 0 ? String(n) : this.t('admin.empty_memorised')
    },
    sessionsLabel(value) {
      const n = Number(value || 0)
      return n > 0 ? String(n) : this.t('admin.empty_sessions')
    },
    learningLabel(value) {
      const n = Number(value || 0)
      return n > 0 ? String(n) : this.t('admin.empty_learning')
    },
    lastActiveLabel(value) {
      if (!value) return this.t('admin.empty_last_active')
      return this.formatRelative(value) || this.t('admin.empty_last_active')
    },
    sessionsPill(row) {
      const n = Number(row?.sessions_completed || 0)
      if (n <= 0) return this.t('admin.empty_sessions')
      return this.t('admin.card_sessions', { n })
    },
    memorisedPill(row) {
      const n = Number(row?.memorised_ayahs || 0)
      if (n <= 0) return this.t('admin.empty_memorised')
      return this.t('admin.card_memorised', { n })
    },
    lastActivePill(row) {
      if (!row?.last_activity_at) return this.t('admin.empty_last_active')
      return this.t('admin.card_last_active', { n: this.lastActiveLabel(row.last_activity_at) })
    },
  },
}
</script>
