<template>
  <main id="mainContent" class="user-dashboard user-dashboard--progress" tabindex="-1">
    <div class="container-fluid user-dashboard__shell">
      <div v-if="loading && !data" class="user-dashboard__loading" role="status" aria-live="polite">
        <div class="dash-spinner" aria-hidden="true"></div>
        <span>{{ t('dashboard.loading') }}</span>
      </div>

      <NetworkFallback
        v-else-if="error && !data"
        class="user-dashboard__error"
        page
        :kind="failureKind"
        :auto-retry-on-reconnect="false"
        home-href="/"
        @retry="reload(true)"
      />

      <NetworkFallback
        v-else-if="!data"
        class="user-dashboard__error"
        page
        kind="failure"
        :title="t('common.status.emptyTitle')"
        :description="t('common.status.emptyDesc')"
        home-href="/"
        @retry="reload(true)"
      />

      <template v-else>
        <header class="dash-hero dash-section dash-reveal">
          <div class="dash-hero__top">
            <div class="dash-hero__greeting">
              <h1 id="dash-welcome-heading">{{ greetingText }}</h1>
              <p v-if="showHeroProgressSummary" class="dash-hero__summary">{{ heroProgressSummary }}</p>
            </div>
            <button
              type="button"
              class="dash-icon-btn"
              :disabled="loading"
              :aria-label="t('dashboard.refresh')"
              @click="reload(true)"
            >
              <i class="bi bi-arrow-clockwise" :class="{ 'is-spinning': loading }" aria-hidden="true"></i>
            </button>
          </div>

          <div class="dash-hero__stack">
            <a
              v-if="primaryContinueAction"
              class="dash-continue-card"
              data-testid="dashboard-primary-continue"
              :data-kind="primaryContinueAction.kind"
              :class="{
                'dash-continue-card--primary': true,
                'dash-continue-card--saved': primaryContinueAction.kind === 'saved',
                'dash-continue-card--fresh': primaryContinueAction.kind === 'fresh',
                'dash-continue-card--revise': primaryContinueAction.kind === 'revise',
                'dash-continue-card--daily-mutqin': primaryContinueAction.kind === 'fresh' || primaryContinueAction.kind === 'journey',
              }"
              :href="primaryContinueAction.href"
              :aria-label="primaryContinueAction.ariaLabel || undefined"
            >
              <span class="dash-continue-card__icon" aria-hidden="true">
                <i :class="primaryContinueAction.icon" aria-hidden="true"></i>
              </span>
              <div class="dash-continue-card__main">
                <span class="dash-continue-card__label">{{ primaryContinueAction.label }}</span>
                <strong class="dash-continue-card__title">{{ primaryContinueAction.title }}</strong>
                <p v-if="primaryContinueAction.hint" class="dash-continue-card__hint">
                  {{ primaryContinueAction.hint }}
                </p>
                <p v-else-if="primaryContinueAction.range" class="dash-continue-card__learning">
                  {{ primaryContinueAction.range }}
                </p>
              </div>
              <span class="dash-continue-card__cta">
                <i class="bi bi-arrow-right-short" aria-hidden="true"></i>
                {{ primaryContinueAction.cta }}
              </span>
            </a>
          </div>
        </header>

        <div class="user-dashboard__content">
        <section
          class="dash-section dash-section--flat dash-learning"
          :class="{ 'is-collapsed': isSectionCollapsed('learning') }"
          aria-labelledby="dash-learning-heading"
        >
          <div class="dash-section__head dash-section__head--compact">
            <button
              type="button"
              class="dash-section__collapse"
              :aria-expanded="isSectionCollapsed('learning') ? 'false' : 'true'"
              aria-controls="dash-learning-body"
              @click="toggleSection('learning')"
            >
              <span class="dash-section__title">
                <span class="dash-section__icon dash-section__icon--activity" aria-hidden="true">
                  <i class="bi bi-journal-bookmark" aria-hidden="true"></i>
                </span>
                <span class="dash-section__title-copy">
                  <h2 id="dash-learning-heading">{{ t('dashboard.learning_title') }}</h2>
                  <p class="dash-section__hint">{{ t('dashboard.learning_period', { days: chartDays }) }}</p>
                </span>
              </span>
              <i class="bi dash-section__chevron" :class="isSectionCollapsed('learning') ? 'bi-chevron-down' : 'bi-chevron-up'" aria-hidden="true"></i>
            </button>
          </div>
          <div v-show="!isSectionCollapsed('learning')" id="dash-learning-body" class="dash-section__body dash-learning__body">
            <div class="dash-learning__metrics dash-learning__metrics--compact" role="list">
              <button v-for="metric in learningCards" :key="metric.key" type="button" class="dash-learning__metric" role="listitem" @click="onLearningMetric(metric)">
                <strong>{{ metric.value }}</strong>
                <span>{{ metric.label }}</span>
                <small>{{ metric.hint }}</small>
              </button>
            </div>

            <div
              v-if="canUseAdvancedAnalytics"
              class="dash-advanced-analytics"
              data-testid="advanced-analytics-entry"
            >
              <button
                type="button"
                class="dash-advanced-analytics__cta"
                @click="openAdvancedAnalytics"
              >
                <span class="dash-advanced-analytics__icon" aria-hidden="true">
                  <i class="bi bi-bar-chart-line" aria-hidden="true"></i>
                </span>
                <span class="dash-advanced-analytics__copy">
                  <strong>{{ t('dashboard.advanced_analytics.entry_cta') }}</strong>
                  <small>{{ t('dashboard.advanced_analytics.entry_hint') }}</small>
                </span>
                <i class="bi bi-arrow-right-short" aria-hidden="true"></i>
              </button>
            </div>
          </div>
        </section>

        <div v-if="showMurajaahSection || showAiReciteSection" class="user-dashboard__review-row user-dashboard__review-row--secondary">
        <section
          v-if="showMurajaahSection"
          class="dash-section dash-section--flat dash-reveal dash-section--murajaah"
          :class="{
            'dash-section--empty': showMurajaahEmpty,
            'is-collapsed': isSectionCollapsed('murajaah'),
          }"
          aria-labelledby="dash-murajaah-heading"
          style="--dash-delay: 20ms"
        >
          <div class="dash-murajaah-block">
            <div class="dash-murajaah-block__head dash-murajaah-block__head--compact">
              <button
                type="button"
                class="dash-section__collapse dash-murajaah-block__head-main"
                :aria-expanded="isSectionCollapsed('murajaah') ? 'false' : 'true'"
                aria-controls="dash-murajaah-body"
                @click="toggleSection('murajaah')"
              >
                <span class="dash-murajaah-block__title-row">
                  <span class="dash-section__icon dash-section__icon--review" aria-hidden="true">
                    <i class="bi bi-arrow-repeat" aria-hidden="true"></i>
                  </span>
                  <span class="dash-section__title-copy">
                    <h2 id="dash-murajaah-heading" class="dash-murajaah-block__title">
                      {{ t('dashboard.revisit_title') }}
                    </h2>
                    <p class="dash-section__hint">{{ t('dashboard.revisit_subtitle') }}</p>
                  </span>
                </span>
                <i class="bi dash-section__chevron" :class="isSectionCollapsed('murajaah') ? 'bi-chevron-down' : 'bi-chevron-up'" aria-hidden="true"></i>
              </button>
              <button
                v-if="showMurajaahViewAll && !isSectionCollapsed('murajaah')"
                type="button"
                class="dash-glance-action dash-glance-action--ghost dash-murajaah-block__view-all"
                @click="openDrawer('murajaah')"
              >
                <i class="bi bi-list-ul" aria-hidden="true"></i>
                {{ t('dashboard.view_all_reviews') }}
              </button>
            </div>

            <div v-show="!isSectionCollapsed('murajaah')" id="dash-murajaah-body">
            <div v-if="showMurajaahEmpty" class="dash-murajaah-block__empty dash-empty">
              <p class="dash-murajaah-block__empty-title">{{ t('dashboard.revisit_empty_title') }}</p>
              <p class="dash-murajaah-block__empty-hint">{{ t('dashboard.revisit_empty_hint') }}</p>
            </div>

            <template v-else>
            <ul class="dash-murajaah-list dash-revisit" data-testid="next-to-revisit">
              <li v-for="(item, index) in revisitItems" :key="item.key">
                <article
                  class="dash-revisit__card dash-reveal"
                  :class="{ 'is-collapsed': isCardCollapsed(`revisit:${item.key}`) }"
                  :style="{ '--dash-delay': `${index * 50}ms` }"
                >
                  <header class="dash-revisit__head">
                    <button
                      type="button"
                      class="dash-card__collapse"
                      :aria-expanded="isCardCollapsed(`revisit:${item.key}`) ? 'false' : 'true'"
                      @click="toggleRevisitCard(item.key)"
                    >
                      <span class="dash-revisit__head-copy">
                        <h3 class="dash-revisit__title">
                          {{ item.surah_name }} · {{ t('dashboard.ayah_n', { n: item.ayah_number }) }}
                        </h3>
                        <span class="dash-revisit__summary">
                          <span
                            v-if="item.accuracy_percent != null"
                            class="dash-revisit__meta dash-revisit__meta--inline"
                          >
                            {{ t('dashboard.ai_match_plain', { n: item.accuracy_percent }) }}
                          </span>
                          <span class="dash-revisit__state" :class="`is-${item.assessment_state || 'not_assessed'}`">
                            {{ revisitStateLabel(item) }}
                          </span>
                        </span>
                        <span v-if="murajaahItemHint(item)" class="dash-revisit__reason">
                          {{ murajaahItemHint(item) }}
                        </span>
                      </span>
                      <i class="bi dash-section__chevron" :class="isCardCollapsed(`revisit:${item.key}`) ? 'bi-chevron-down' : 'bi-chevron-up'" aria-hidden="true"></i>
                    </button>
                    <a
                      class="dash-btn dash-btn--primary dash-btn--sm dash-murajaah-row__cta dash-revisit__cta-inline"
                      :href="reviewNowHref(item)"
                      @click="stashReviewContext(item)"
                    >
                      <i class="bi bi-arrow-repeat" aria-hidden="true"></i>
                      {{ t('dashboard.revisit_review') }}
                    </a>
                  </header>
                  <div v-show="!isCardCollapsed(`revisit:${item.key}`)" class="dash-revisit__body">
                    <div class="dash-revisit__ayah">
                      <p
                        v-if="referenceLine(item).words.length"
                        class="dash-ayah"
                        lang="ar"
                        dir="rtl"
                      >
                        <span
                          v-for="(word, wordIndex) in referenceLine(item).words"
                          :key="`${item.key}-${wordIndex}`"
                          class="dash-word"
                          :class="`is-${word.state}`"
                        >
                          <span class="dash-word__text">{{ word.text }}</span>
                          <span class="visually-hidden">{{ t(word.labelKey) }}</span>
                        </span>
                      </p>
                      <p v-else class="dash-revisit__missing">{{ t('dashboard.reference_unavailable') }}</p>
                    </div>
                    <footer class="dash-revisit__foot">
                      <div class="dash-revisit__stats">
                        <p
                          v-if="weakHistoryLine(item)"
                          class="dash-murajaah-row__history"
                          data-testid="dash-weak-history"
                        >{{ weakHistoryLine(item) }}</p>
                      </div>
                    </footer>
                  </div>
                </article>
              </li>
            </ul>
            </template>
            </div>
          </div>
        </section>

        <section
          v-if="showAiReciteSection"
          id="ai-recite-results"
          ref="aiReciteResults"
          class="dash-section dash-section--flat dash-ai-results dash-reveal"
          :class="{
            'dash-section--empty': !aiReciteLoading && !aiReciteError && (!aiReciteView || aiReciteView.empty),
            'is-collapsed': isSectionCollapsed('ai_recite'),
          }"
          aria-labelledby="dash-ai-results-heading"
          style="--dash-delay: 40ms"
        >
          <div class="dash-section__head dash-section__head--compact">
            <div class="dash-section__head-row">
              <button
                type="button"
                class="dash-section__collapse"
                :aria-expanded="isSectionCollapsed('ai_recite') ? 'false' : 'true'"
                aria-controls="dash-ai-results-body"
                @click="toggleSection('ai_recite')"
              >
                <span class="dash-section__title">
                  <span class="dash-section__icon dash-section__icon--activity" aria-hidden="true">
                    <i class="bi bi-mic" aria-hidden="true"></i>
                  </span>
                  <span class="dash-section__title-copy">
                    <h2 id="dash-ai-results-heading">{{ t('dashboard.ai_recite.results_title') }}</h2>
                    <p class="dash-section__hint">{{ t('dashboard.ai_recite.results_subtitle') }}</p>
                  </span>
                </span>
                <i class="bi dash-section__chevron" :class="isSectionCollapsed('ai_recite') ? 'bi-chevron-down' : 'bi-chevron-up'" aria-hidden="true"></i>
              </button>
            </div>
          </div>

          <div v-show="!isSectionCollapsed('ai_recite')" id="dash-ai-results-body" class="dash-section__body">
            <div v-if="aiReciteLoading && !aiReciteStats" class="dash-ai-results__status dash-fb-skeleton" role="status">
              <span class="visually-hidden">{{ t('dashboard.loading') }}</span>
              <div class="dash-fb-skeleton__card" aria-hidden="true"></div>
              <div class="dash-fb-skeleton__card" aria-hidden="true"></div>
              <div class="dash-fb-skeleton__card" aria-hidden="true"></div>
            </div>
            <div v-else-if="aiReciteError && (!aiReciteView || aiReciteView.empty)" class="dash-ai-results__status">
              <p>{{ t('dashboard.ai_recite.stats_error_title') }}</p>
              <button type="button" class="dash-btn dash-btn--ghost dash-btn--sm" @click="loadAiReciteResults">
                {{ t('dashboard.retry') }}
              </button>
            </div>
            <div v-else-if="!aiReciteView || aiReciteView.empty" class="dash-ai-results__empty">
              <span class="dash-ai-results__empty-icon" aria-hidden="true">
                <i class="bi bi-mic" aria-hidden="true"></i>
              </span>
              <p class="dash-ai-results__empty-title">{{ t('dashboard.ai_recite.stats_empty_title') }}</p>
              <p class="dash-ai-results__empty-hint">{{ t('dashboard.ai_recite.results_empty_hint') }}</p>
              <a class="dash-btn dash-btn--ghost dash-btn--sm" :href="testRecitationHref">
                <i class="bi bi-mic" aria-hidden="true"></i>
                {{ t('dashboard.ai_recite.test_cta') || t('dashboard.open_practice') }}
              </a>
            </div>
            <template v-else>
              <p v-if="aiReciteSummaryLine" class="dash-ai-results__summary-line">{{ aiReciteSummaryLine }}</p>

              <p v-if="aiReciteHolding" class="dash-ai-results__holding">
                <i class="bi bi-check2-circle" aria-hidden="true"></i>
                <span>
                  <strong>{{ t('dashboard.ai_recite.results_holding_title') }}</strong>
                  {{ t('dashboard.ai_recite.results_holding_hint') }}
                </span>
              </p>

              <div class="dash-ai-results__layout">
                <section
                  class="dash-ai-results__panel dash-ai-results__panel--list"
                  :aria-label="t('dashboard.ai_recite.recent_attempts')"
                >
                  <div v-if="aiReciteVisibleCards.length" class="dash-review-feed-scroll">
                    <ul class="dash-section__feed dash-ai-results__attempts dash-fb-cards">
                      <DashAiReciteAttemptCard
                        v-for="item in aiReciteVisibleCards"
                        :key="item.card_key"
                        :item="item"
                        :expanded="item.card_kind === 'attempt' && expandedAttemptId === item.id"
                        :loading="expandedAttemptId === item.id && expandedLoading"
                        :error="expandedAttemptId === item.id && expandedError"
                        :detail="expandedAttemptId === item.id ? expandedComparison : null"
                        :tone="aiAttemptTone(item)"
                        :title="aiCheckTitle(item)"
                        :range-label="ayahRangeLabel(item)"
                        :checked-label="aiCheckedLabel(item)"
                        :score-short="aiAttemptScoreShort(item)"
                        :percent-label="aiAttemptAccuracy(item)"
                        :review-href="reviewNowHref(attemptReviewItem(item))"
                        :check-again-href="checkAgainHref(item)"
                        :focus-href="focusReviewHref(item)"
                        :review-item="attemptReviewItem(item)"
                        :build-review-href="(payload) => reviewNowHref(payload)"
                        @toggle="toggleAttemptDetail(item)"
                        @retry="toggleAttemptDetail(item, true)"
                        @listen="openAnalysisForItem(item, 'attempt')"
                        @stash-review="stashReviewContext"
                      />
                    </ul>
                  </div>
                  <p v-else class="dash-ai-results__muted">{{ t('dashboard.ai_recite.no_recent') }}</p>
                </section>
              </div>

              <button
                type="button"
                class="dash-ai-results__all-link"
                @click="openDrawer('ai_checks')"
              >
                {{ t('dashboard.ai_recite.view_all_checks') }}
                <i class="bi bi-arrow-right-short" aria-hidden="true"></i>
              </button>
            </template>
          </div>
        </section>
        </div>

        <DashboardAchievementsWidget
          v-if="achievementsWidget"
          :widget="achievementsWidget"
          :collapsed="isSectionCollapsed('achievements')"
          :title="t('dashboard.achievements.title')"
          :subtitle="t('dashboard.achievements.subtitle')"
          :subtitle-for="achievementSectionSubtitle"
          :view-all-label="t('dashboard.achievements.view_all')"
          :show-more-label="t('dashboard.achievements.show_more')"
          :show-less-label="t('dashboard.achievements.show_less')"
          :empty-title="t('dashboard.achievements.empty_title')"
          :empty-hint="t('dashboard.achievements.empty_hint')"
          :locale="localeCode"
          :unlock-prefix="t('dashboard.achievements.unlocked_on')"
          :name-for="achievementName"
          :description-for="achievementDescription"
          :meaning-for="achievementMeaning"
          :status-for="achievementStatusLabel"
          :progress-for="achievementProgressLabel"
          :remaining-for="achievementRemainingLabel"
          :requirement-for="achievementRequirement"
          :tier-title-for="achievementTierTitle"
          :tier-hint-for="achievementTierHint"
          @toggle="toggleSection('achievements')"
          @view-all="openAchievementsDrawer"
        />

        <section
          class="dash-section dash-section--flat dash-history"
          :class="{ 'is-collapsed': isSectionCollapsed('history') }"
          aria-labelledby="dash-history-heading"
        >
          <div class="dash-section__head dash-section__head--compact">
            <div class="dash-section__head-row">
              <button
                type="button"
                class="dash-section__collapse"
                :aria-expanded="isSectionCollapsed('history') ? 'false' : 'true'"
                aria-controls="dash-history-body"
                @click="toggleSection('history')"
              >
                <span class="dash-section__title">
                  <span class="dash-section__title-copy">
                    <h2 id="dash-history-heading">{{ t('dashboard.history_title') }}</h2>
                    <p class="dash-section__hint">{{ t('dashboard.history_hint') }}</p>
                  </span>
                </span>
                <i class="bi dash-section__chevron" :class="isSectionCollapsed('history') ? 'bi-chevron-down' : 'bi-chevron-up'" aria-hidden="true"></i>
              </button>
            </div>
          </div>
          <div v-show="!isSectionCollapsed('history')" id="dash-history-body">
          <p v-if="historyLoading" class="dash-history__status" role="status">{{ t('dashboard.loading') }}</p>
          <p v-else-if="historyError" class="dash-history__status">
            {{ t('dashboard.drawer_load_error') }}
            <button type="button" class="dash-btn dash-btn--ghost dash-btn--sm" @click="loadLearningHistory">{{ t('dashboard.retry') }}</button>
          </p>
          <p v-else-if="!historyGroups.length" class="dash-history__status">{{ t('dashboard.history_empty') }}</p>
          <div v-else class="dash-history__groups">
            <section v-for="group in historyGroups" :key="group.key" class="dash-history__group">
              <h3>{{ group.label }}</h3>
              <ul class="dash-history__list">
                <li v-for="item in group.items" :key="item.id || item.occurred_at">
                  <a
                    v-if="historyEntryHref(item)"
                    class="dash-history__link"
                    :href="historyEntryHref(item)"
                  >
                    <span class="dash-history__mark" :class="`is-${item.practice_kind || 'session'}`" aria-hidden="true">
                      <i :class="historyKindIcon(item)"></i>
                    </span>
                    <span class="dash-history__copy">
                      <span class="dash-history__kind">{{ historyKindLabel(item) }}</span>
                      <span class="dash-history__title">{{ historyTitle(item) }}</span>
                      <span v-if="historyActionHint(item)" class="dash-history__action">{{ historyActionHint(item) }}</span>
                    </span>
                    <time :datetime="item.occurred_at">{{ formatHistoryClock(item.occurred_at) }}</time>
                    <i class="bi bi-chevron-right dash-history__go" aria-hidden="true"></i>
                  </a>
                  <div v-else class="dash-history__link">
                    <span class="dash-history__mark" :class="`is-${item.practice_kind || 'session'}`" aria-hidden="true">
                      <i :class="historyKindIcon(item)"></i>
                    </span>
                    <span class="dash-history__copy">
                      <span class="dash-history__kind">{{ historyKindLabel(item) }}</span>
                      <span class="dash-history__title">{{ historyTitle(item) }}</span>
                    </span>
                    <time :datetime="item.occurred_at">{{ formatHistoryClock(item.occurred_at) }}</time>
                  </div>
                </li>
              </ul>
            </section>
            <div v-if="historyHasMore || historyCanCollapse" class="dash-history__toggle-row">
              <button
                v-if="historyHasMore"
                type="button"
                class="dash-btn dash-btn--ghost dash-history__more w-100"
                @click="expandHistory"
              >{{ t('dashboard.history_more') }}</button>
              <button
                v-if="historyCanCollapse"
                type="button"
                class="dash-btn dash-btn--ghost dash-history__less w-100"
                @click="collapseHistory"
              >{{ t('dashboard.history_less') }}</button>
            </div>
          </div>
          </div>
        </section>
        </div>

      </template>
    </div>

    <Teleport to="body">
      <div
        v-if="drawerOpen"
        ref="drawerRoot"
        class="dash-drawer-root"
        @keydown="onDrawerKeydown"
      >
        <button
          type="button"
          class="dash-drawer__backdrop"
          :aria-label="t('dashboard.drawer_close')"
          @click="closeDrawer"
        ></button>
          <aside
            ref="drawer"
            class="dash-drawer"
            :class="drawerMode ? `dash-drawer--${drawerMode}` : ''"
            tabindex="-1"
            role="dialog"
            aria-modal="true"
            :aria-labelledby="drawerTitleId"
          >
            <div class="dash-drawer__handle" aria-hidden="true"></div>
            <header class="dash-drawer__head">
            <div class="dash-drawer__head-main">
              <span v-if="drawerIcon" class="dash-drawer__head-icon" aria-hidden="true">
                <i :class="drawerIcon"></i>
              </span>
              <div class="dash-drawer__head-copy">
                <h2 :id="drawerTitleId" class="dash-drawer__title">{{ drawerTitle }}</h2>
                <p class="dash-drawer__subtitle">{{ drawerSubtitle }}</p>
                <p v-if="drawerCountLabel" class="dash-drawer__count">{{ drawerCountLabel }}</p>
              </div>
            </div>
            <button
              ref="drawerClose"
              type="button"
              class="dash-icon-btn dash-drawer__close"
              :aria-label="t('dashboard.drawer_close')"
              @click="closeDrawer"
            >
              <i class="bi bi-x-lg" aria-hidden="true"></i>
            </button>
          </header>

          <div class="dash-drawer__body">
            <div class="dash-drawer__content">
              <div
                v-if="drawerMode === 'activity' && !drawerLoading && !drawerError"
                class="dash-drawer__filters"
              role="tablist"
              :aria-label="t('dashboard.drawer_activity_title')"
            >
              <button
                v-for="filter in activityFilters"
                :key="filter.key"
                type="button"
                role="tab"
                class="dash-drawer__filter"
                :class="{ 'is-active': activityFilter === filter.key }"
                :aria-selected="activityFilter === filter.key ? 'true' : 'false'"
                @click="activityFilter = filter.key"
              >
                {{ filter.label }}
              </button>
              </div>

              <div v-if="drawerLoading" class="dash-drawer__status dash-drawer__status--loading" role="status">
              <div class="dash-spinner" aria-hidden="true"></div>
              <span>{{ t('dashboard.drawer_loading') }}</span>
            </div>
            <div v-else-if="drawerError" class="dash-drawer__status dash-drawer__status--error" role="alert">
              <span class="dash-drawer__status-icon dash-drawer__status-icon--error" aria-hidden="true">
                <i class="bi bi-wifi-off"></i>
              </span>
              <p>{{ t('dashboard.drawer_load_error') }}</p>
              <button type="button" class="dash-btn dash-btn--ghost dash-btn--sm" @click="retryDrawer">
                {{ t('dashboard.retry') }}
              </button>
            </div>
            <div
              v-else-if="!visibleDrawerItems.length && drawerMode !== 'ai_checks' && drawerMode !== 'achievements'"
              class="dash-drawer__status dash-drawer__status--empty"
            >
              <span class="dash-drawer__status-icon" aria-hidden="true">
                <i class="bi bi-inbox"></i>
              </span>
              <p>{{ drawerEmptyMessage }}</p>
            </div>

            <ul v-else-if="drawerMode === 'activity'" class="dash-drawer__list">
              <li
                v-for="(item, index) in visibleDrawerItems"
                :key="item.id || `${item.type}-${item.occurred_at}`"
              >
                <div
                  class="dash-drawer__row dash-drawer__row--analysis dash-reveal"
                  :style="{ '--dash-delay': `${Math.min(index, 12) * 40}ms` }"
                >
                  <div class="dash-drawer__analysis-copy">
                    <span class="dash-drawer__type">{{ activityTypeLabel(item.type) }}</span>
                    <span class="dash-drawer__row-title">{{ activityTitle(item) }}</span>
                    <span v-if="activityOutcome(item)" class="dash-drawer__row-meta">{{ activityOutcome(item) }}</span>
                    <time class="dash-drawer__row-time" :datetime="item.occurred_at">
                      {{ formatActivityDate(item.occurred_at) }}
                    </time>
                  </div>
                  <div v-if="canViewAnalysis(item)" class="dash-drawer__analysis-actions">
                    <button
                      type="button"
                      class="dash-btn dash-btn--primary dash-btn--sm dash-drawer__analysis-cta"
                      :disabled="isAnalysisLoading(item)"
                      @click="openAnalysisForItem(item)"
                    >
                      <i class="bi bi-graph-up" aria-hidden="true"></i>
                      {{ t('dashboard.view_analysis') }}
                    </button>
                  </div>
                </div>
              </li>
            </ul>

            <ul v-else-if="drawerMode === 'sessions'" class="dash-drawer__list">
              <li
                v-for="(item, index) in visibleDrawerItems"
                :key="`session-${item.id}`"
              >
                <div
                  class="dash-drawer__row dash-drawer__row--analysis dash-reveal"
                  :style="{ '--dash-delay': `${Math.min(index, 12) * 40}ms` }"
                >
                  <div class="dash-drawer__analysis-copy">
                    <span class="dash-drawer__type">{{ t('dashboard.activity_type_session') }}</span>
                    <span class="dash-drawer__row-title">
                      {{ item.surah_name || t('dashboard.not_started') }}
                      <template v-if="formatItemRange(item)"> · {{ formatItemRange(item) }}</template>
                    </span>
                    <span class="dash-drawer__row-meta">{{ sessionStatusLabel(item.status) }}</span>
                    <time class="dash-drawer__row-time" :datetime="item.occurred_at">
                      {{ formatActivityDate(item.occurred_at) }}
                    </time>
                  </div>
                  <div v-if="canViewAnalysis(item, 'session')" class="dash-drawer__analysis-actions">
                    <button
                      type="button"
                      class="dash-btn dash-btn--primary dash-btn--sm dash-drawer__analysis-cta"
                      :disabled="isAnalysisLoading(item, 'session')"
                      @click="openAnalysisForItem(item, 'session')"
                    >
                      <i class="bi bi-graph-up" aria-hidden="true"></i>
                      {{ t('dashboard.view_analysis') }}
                    </button>
                  </div>
                </div>
              </li>
            </ul>

            <template v-else-if="drawerMode === 'ai_checks'">
              <div
                v-if="!drawerLoading && !drawerError"
                class="dash-drawer__filters dash-drawer__filters--stack"
              >
                <label class="dash-drawer__search">
                  <span class="visually-hidden">{{ t('dashboard.ai_history_search_label') }}</span>
                  <i class="bi bi-search" aria-hidden="true"></i>
                  <input
                    v-model="drawerAiSearch"
                    type="search"
                    class="dash-drawer__search-input"
                    :placeholder="t('dashboard.ai_history_search_placeholder')"
                    autocomplete="off"
                  />
                </label>
                <div class="dash-drawer__filters" role="tablist" :aria-label="t('dashboard.ai_history_filter_label')">
                  <button
                    v-for="filter in aiCheckBandFilters"
                    :key="filter.key"
                    type="button"
                    role="tab"
                    class="dash-drawer__filter"
                    :class="{ 'is-active': drawerAiBandFilter === filter.key }"
                    :aria-selected="drawerAiBandFilter === filter.key ? 'true' : 'false'"
                    @click="drawerAiBandFilter = filter.key"
                  >
                    {{ filter.label }}
                  </button>
                </div>
              </div>
              <p
                v-if="!drawerLoading && !drawerError && !visibleDrawerItems.length"
                class="dash-drawer__status dash-drawer__status--empty dash-drawer__status--inline"
              >
                {{ t('dashboard.ai_history_empty_filtered') }}
              </p>
              <ul v-else class="dash-drawer__list dash-drawer__list--ai-checks">
                <li v-for="(item, index) in visibleDrawerItems" :key="`ai-${item.id}`">
                  <div
                    class="dash-drawer__ai-check dash-reveal"
                    :style="{ '--dash-delay': `${Math.min(index, 12) * 40}ms` }"
                  >
                    <div class="dash-drawer__ai-check-card">
                      <button
                        v-if="canViewAnalysis(item, 'attempt')"
                        type="button"
                        class="dash-drawer__ai-check-main"
                        :disabled="isAnalysisLoading(item, 'attempt')"
                        :aria-label="aiAttemptActionLabel(item)"
                        @click="openAnalysisForItem(item, 'attempt')"
                      >
                        <span
                          class="dash-drawer__ai-check-score"
                          :class="`is-${aiAttemptTone(item)}`"
                        >{{ aiAttemptScoreShort(item) }}</span>
                        <span class="dash-drawer__ai-check-copy">
                          <span class="dash-drawer__ai-check-title">
                            {{ aiCheckTitle(item) }}
                            <template v-if="formatItemRange(item)"> · {{ formatItemRange(item) }}</template>
                          </span>
                          <span class="dash-drawer__ai-check-meta">
                            <span v-if="aiBandLabel(item.band)">{{ aiBandLabel(item.band) }}</span>
                            <time :datetime="item.occurred_at">{{ formatActivityDate(item.occurred_at) }}</time>
                          </span>
                        </span>
                        <i
                          class="dash-drawer__ai-check-go"
                          :class="isAnalysisLoading(item, 'attempt') ? 'bi bi-hourglass-split' : 'bi bi-chevron-right'"
                          aria-hidden="true"
                        ></i>
                      </button>
                      <div class="dash-drawer__ai-check-actions">
                        <a
                          v-if="aiCheckRevisionHref(item)"
                          class="dash-btn dash-btn--ghost dash-btn--sm"
                          :href="aiCheckRevisionHref(item)"
                        >
                          <i class="bi bi-arrow-repeat" aria-hidden="true"></i>
                          {{ t('dashboard.review_now') }}
                        </a>
                        <button
                          v-if="canViewAnalysis(item, 'attempt')"
                          type="button"
                          class="dash-btn dash-btn--primary dash-btn--sm dash-drawer__analysis-cta"
                          :disabled="isAnalysisLoading(item, 'attempt')"
                          @click="openAnalysisForItem(item, 'attempt')"
                        >
                          <i class="bi bi-graph-up" aria-hidden="true"></i>
                          {{ t('dashboard.view_analysis') }}
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              </ul>
            </template>

            <div v-else-if="drawerMode === 'achievements'" class="dash-drawer__achievements">
              <AchievementsPanel
                :items="achievementDrawerItems"
                :tiers="achievementDrawerTiers"
                :locale="localeCode"
                :show-more-label="t('dashboard.achievements.show_more')"
                :show-less-label="t('dashboard.achievements.show_less')"
                :name-for="achievementName"
                :description-for="achievementDescription"
                :meaning-for="achievementMeaning"
                :status-for="achievementStatusLabel"
                :progress-for="achievementProgressLabel"
                :requirement-for="achievementRequirement"
                :tier-title-for="achievementTierTitle"
                :tier-hint-for="achievementTierHint"
                :unlock-prefix="t('dashboard.achievements.unlocked_on')"
              />
            </div>
            <ul v-else-if="drawerMode === 'murajaah' || drawerMode === 'due'" class="dash-drawer__list dash-drawer__list--murajaah">
              <li v-for="(item, index) in visibleDrawerItems" :key="`${drawerMode}-${item.key}`">
                <div
                  class="dash-drawer__row dash-drawer__row--murajaah dash-reveal"
                  :style="{ '--dash-delay': `${Math.min(index, 12) * 40}ms` }"
                >
                  <div class="dash-drawer__murajaah-copy">
                    <div class="dash-drawer__murajaah-top">
                      <span class="dash-drawer__type">{{ drawerMode === 'due' ? t('dashboard.daily_revision_due') : t('dashboard.daily_revision_weak') }}</span>
                      <span
                        v-if="item.strength"
                        class="dash-strength dash-strength--compact"
                        :class="`dash-strength--${item.strength}`"
                      >
                        {{ strengthLabel(item) }}
                      </span>
                    </div>
                    <span class="dash-drawer__row-title dash-drawer__murajaah-ref">
                      <span v-if="index === 0 && item.strength === 'fragile'" class="dash-murajaah-priority">
                        {{ t('dashboard.revision_priority_start') }}
                      </span>
                      {{ item.surah_name }} · {{ t('dashboard.ayah_n', { n: item.ayah_number }) }}
                    </span>
                    <p class="dash-drawer__row-meta dash-drawer__murajaah-note">{{ murajaahItemHint(item) }}</p>
                  </div>
                  <div class="dash-drawer__murajaah-actions">
                    <a class="dash-btn dash-btn--primary dash-btn--sm dash-drawer__murajaah-cta" :href="reviewNowHref(item)">
                      {{ t('dashboard.review_now') }}
                    </a>
                  </div>
                </div>
              </li>
            </ul>

            <ul v-else-if="drawerMode === 'hifz'" class="dash-drawer__list">
              <li v-for="(group, index) in visibleDrawerItems" :key="`hifz-${group.surah_number}`">
                <div
                  class="dash-drawer__group dash-reveal"
                  :style="{ '--dash-delay': `${Math.min(index, 12) * 40}ms` }"
                >
                  <div class="dash-drawer__group-head">
                    <span class="dash-drawer__row-title">{{ group.surah_name }}</span>
                    <span class="dash-drawer__row-meta">
                      {{ t('dashboard.drawer_hifz_memorised', { n: group.memorised_count }) }}
                      · {{ t('dashboard.drawer_hifz_in_progress', { n: group.learning_count }) }}
                    </span>
                  </div>
                  <p v-if="group.memorised_ayahs.length" class="dash-drawer__ayahs">
                    {{ group.memorised_ayahs.map((n) => t('dashboard.ayah_n', { n })).join(' · ') }}
                  </p>
                </div>
              </li>
            </ul>
            </div>
          </div>
        </aside>
      </div>
    </Teleport>

    <SessionAnalysisModal
      :open="analysisModalOpen && analysisSourceKind !== 'attempt'"
      :loading="analysisLoading"
      :error="analysisError"
      :empty="!analysisLoading && !analysisError && analysisModalOpen && !analysisView?.hasContent"
      :analysis="analysisView"
      :title="t('memorisation.session_analytics_overview')"
      :close-label="t('common.close')"
      :loading-label="t('memorisation.preparing_analytics')"
      :error-title="t('memorisation.analyticsEmpty.modalErrorTitle')"
      :error-desc="t('memorisation.analyticsEmpty.modalErrorDesc')"
      :error-action-label="t('dashboard.retry')"
      error-action="retry"
      :empty-title="t('memorisation.analyticsEmpty.modalEmptyTitle')"
      :empty-desc="t('dashboard.analysis_empty_desc')"
      :ai-results-title="t('memorisation.recite_check_results')"
      :ai-results-subtitle="t('memorisation.saved_word_checks_for_this_session_range')"
      :words-title="t('dashboard.analysis_words_title')"
      :recitation-label="t('dashboard.analysis_recitation_label')"
      :correct-ayah-label="t('dashboard.analysis_correct_ayah_label')"
      :not-recited-label="t('dashboard.analysis_not_recited_label')"
      :recommendations-title="t('dashboard.analysis_recommendations_title')"
      :audio-title="t('dashboard.analysis_audio_title')"
      :no-recommendations="t('dashboard.analysis_no_recommendations')"
      :audio-unavailable="t('dashboard.analysis_audio_unavailable')"
      :audio-expired="t('dashboard.ai_recite.audio_expired')"
      :play-label="t('dashboard.ai_recite.play')"
      :pause-label="t('dashboard.ai_recite.pause')"
      :restart-label="t('dashboard.ai_recite.restart')"
      :memorisation-base-path="memorisationUrl"
      @close="closeSessionAnalysis"
      @retry="retrySessionAnalysis"
    />

    <AdvancedAnalyticsModal
      :open="advancedAnalyticsOpen"
      @close="closeAdvancedAnalytics"
    />

    <WorkspaceAiReciteResultModal
      v-if="analysisModalOpen && analysisSourceKind === 'attempt'"
      :theme="dashboardTheme"
      :open="analysisModalOpen"
      :loading="analysisLoading"
      :error="analysisError"
      :empty="!analysisLoading && !analysisError && analysisModalOpen && !analysisView?.hasContent"
      :view="analysisView"
      :title="analysisView?.headerTitle || t('memorisation.recite_check_results')"
      :subtitle="analysisView?.headerLead || ''"
      :close-label="t('common.close')"
      :try-again-label="t('memorisation.amd.tryAgain')"
      :your-result-label="t('memorisation.postSession.recommendation.yourResult')"
      :beta-badge-label="t('memorisation.postSession.recommendation.aiRecitationBeta')"
      :disclaimer-label="t('memorisation.amd.disclaimerShort') || t('memorisation.postSession.recommendation.aiDisclaimer')"
      :details-section-label="t('memorisation.postSession.recommendation.viewDetails')"
      :view-details-label="t('memorisation.postSession.recommendation.viewDetails')"
      :hide-details-label="t('memorisation.postSession.recommendation.hideDetails')"
      :result-stats-aria-label="t('memorisation.postSession.recommendation.resultStats')"
      :ai-results-aria-label="t('memorisation.a11y.aiMemorisationResult')"
      :colour-meter-aria-label="t('memorisation.aiCheck.colourMeterAria')"
      :audio-title="t('dashboard.analysis_audio_title')"
      :play-label="t('dashboard.ai_recite.play')"
      :pause-label="t('dashboard.ai_recite.pause')"
      :restart-label="t('dashboard.ai_recite.restart')"
      :error-title="t('memorisation.analyticsEmpty.modalErrorTitle')"
      :error-desc="t('memorisation.analyticsEmpty.modalErrorDesc')"
      :empty-title="t('memorisation.analyticsEmpty.modalEmptyTitle')"
      :empty-desc="t('dashboard.analysis_empty_desc')"
      :attempt-saved="false"
      save-state=""
      :saved-label="''"
      results-href=""
      :results-label="''"
      :show-back-to-progress="true"
      :back-to-progress-label="t('memorisation.back_to_progress') || 'Check progress'"
      :mutashabihat-title="t('memorisation.mutashabihat.driftTitle')"
      :mutashabihat-lead="t('memorisation.mutashabihat.driftLead')"
      :compare-differences-label="t('memorisation.mutashabihat.compareDifferences')"
      @close="closeSessionAnalysis"
      @try-again="retrySavedReciteAttempt"
      @back-to-progress="closeSessionAnalysis"
    />

    <Teleport to="body">
      <Transition name="dash-toast">
        <div v-if="toastMessage" class="dash-toast" role="status" aria-live="polite">
          <i class="bi bi-check2-circle" aria-hidden="true"></i>
          <span>{{ toastMessage }}</span>
          <button type="button" :aria-label="t('common.close')" @click="clearToast">
            <i class="bi bi-x-lg" aria-hidden="true"></i>
          </button>
        </div>
      </Transition>
    </Teleport>

    <AchievementUnlockToast
      :queue="achievementUnlockQueue"
      :kicker="t('dashboard.achievements.unlock_kicker')"
      :dismiss-label="t('common.close')"
      :title-for="achievementName"
      :message-for="achievementUnlockMessage"
      @acknowledge="acknowledgeAchievementUnlock"
    />

    <SessionVoiceAssistant
      v-if="auth.session_voice_enabled && sessionVoiceOpen"
      :theme="darkTheme ? 'dark' : 'light'"
      :memorisation-url="auth.memorisation_url || '/memorisation'"
      :phrase-hints="auth.session_voice_hints || []"
      @close="closeSessionVoice"
    />
  </main>
</template>

<script>
import { defineAsyncComponent } from 'vue'
import { learningApi } from '../scripts/api/learning'
import NetworkFallback from '../components/NetworkFallback.vue'
import LearnerTeacherSection from '../components/teacher/LearnerTeacherSection.vue'
import { applyAssignmentThreadUpdate } from '../scripts/teacher/learnerTaskThread.js'
import DashAnimatedNumber from '../components/DashAnimatedNumber.vue'
import { buildSessionAnalysisView } from '../scripts/sessionAnalysis/buildSessionAnalysisView'
import { buildWorkspaceAiReciteResultView } from '../scripts/workspaceAiRecite/buildWorkspaceAiReciteResultView.js'
import { classifyRequestFailure, subscribeNetworkStatus } from '../utils/networkStatus'
import { activeSessionSnapshotKey } from '../utils/mutqinStorageKeys'
import { progressBarDisplay } from '../utils/progressDisplay'
import { buildDashboardAiReciteStatsView } from '../scripts/dashboardAiRecite/buildStatsView'
import { loadAyah } from '../scripts/dashboardAiRecite/ayahText'
import {
  buildAttemptAyahFeedback,
  feedbackInsightKey,
  resolveWordCounts,
} from '../scripts/dashboardAiRecite/attemptFeedback'
import {
  buildCheckAgainHref,
  buildReviewHref,
  compatibleAttemptDelta,
  paintReferenceWords,
  presentationTone as presentationToneForScore,
  stashPreviousAiCheck,
} from '../scripts/dashboard/progressView'
import DashAiReciteAttemptCard from '../components/dashboard/DashAiReciteAttemptCard.vue'
import { pickDashboardPrimaryKind } from '../scripts/dashboard/primaryAction'
import { dailyMutqinHref, memorisationGoalHref } from '../scripts/session/sessionGoal'
import { recitationAccuracyBand } from '../scripts/engine/recitationThresholds.js'
import {
  clearAiAssessmentRetry,
  clearSessionCompletionRetry,
  consumeDashboardRefreshAfterSession,
  peekDashboardRefreshAfterSession,
  readAiAssessmentRetry,
  readSessionCompletionRetry,
} from '../scripts/session/postSessionDashboardFlow'
import { trackEvent as trackAckeeEvent, ACKEE_EVENTS } from '../scripts/analytics/ackee.js'
import { PRODUCT_EVENTS, trackProductEvent } from '../scripts/analytics/productEvents.js'
import {
  captureReturnFocus,
  handleModalKeydown,
  restoreReturnFocus,
} from '../utils/modalFocus'
import DashboardAchievementsWidget from '../components/achievements/DashboardAchievementsWidget.vue'
import AchievementsPanel from '../components/achievements/AchievementsPanel.vue'
import AchievementUnlockToast from '../components/achievements/AchievementUnlockToast.vue'
import './Dashboard.css'
import './Dashboard.learner-teacher.css'
import '../components/achievements/achievements.css'

const SessionAnalysisModal = defineAsyncComponent(() => import(
  /* webpackChunkName: "session-analysis-modal" */
  '../components/SessionAnalysisModal.vue'
))

const SessionVoiceAssistant = defineAsyncComponent(() => import(
  /* webpackChunkName: "session-voice-rt" */
  '../components/SessionVoiceAssistant.vue'
))

const WorkspaceAiReciteResultModal = defineAsyncComponent(() => import(
  /* webpackChunkName: "workspace-recite-result" */
  '../components/WorkspaceAiReciteResultModal.vue'
))

const AdvancedAnalyticsModal = defineAsyncComponent(() => import(
  /* webpackChunkName: "advanced-analytics-modal" */
  '../components/advancedAnalytics/AdvancedAnalyticsModal.vue'
))

const METRIC_META = [
  { key: 'completed_sessions', tone: 'success', labelKey: 'metric_completed', hintKey: 'metric_completed_hint', drawer: 'sessions', icon: 'bi bi-journal-check' },
  { key: 'saved_sessions', tone: 'accent', labelKey: 'metric_saved', hintKey: 'metric_saved_hint', hrefPanel: 'saved', icon: 'bi bi-bookmark-heart' },
  { key: 'memorised_ayahs', tone: 'info', labelKey: 'metric_memorised', hintKey: 'metric_memorised_hint', altHintKey: 'metric_completed_ayahs_hint', drawer: 'hifz', icon: 'bi bi-stars' },
]

const DRAWER_TITLES = {
  activity: 'drawer_activity_title',
  sessions: 'drawer_sessions_title',
  ai_checks: 'drawer_ai_title',
  notes: 'drawer_notes_title',
  hifz: 'drawer_hifz_title',
  murajaah: 'drawer_murajaah_title',
  due: 'drawer_due_title',
  achievements: 'achievements.drawer_title',
}

const DRAWER_SUBTITLES = {
  activity: 'drawer_activity_subtitle',
  sessions: 'drawer_sessions_subtitle',
  ai_checks: 'drawer_ai_subtitle',
  notes: 'drawer_notes_subtitle',
  hifz: 'drawer_hifz_subtitle',
  murajaah: 'drawer_murajaah_subtitle',
  due: 'drawer_due_subtitle',
  achievements: 'achievements.drawer_subtitle',
}

const DRAWER_EMPTY = {
  activity: 'drawer_activity_empty',
  sessions: 'drawer_sessions_empty',
  ai_checks: 'drawer_ai_empty',
  notes: 'drawer_notes_empty',
  hifz: 'drawer_hifz_empty',
  murajaah: 'drawer_murajaah_empty',
  due: 'drawer_due_empty',
  achievements: 'achievements.empty_title',
}

const DRAWER_ICONS = {
  activity: 'bi bi-clock-history',
  sessions: 'bi bi-journal-check',
  ai_checks: 'bi bi-mic',
  notes: 'bi bi-journal-text',
  hifz: 'bi bi-journal-bookmark',
  murajaah: 'bi bi-arrow-repeat',
  due: 'bi bi-calendar-check',
  achievements: 'bi bi-award',
}

export default {
  name: 'UserDashboard',
  components: {
    NetworkFallback,
    LearnerTeacherSection,
    DashAnimatedNumber,
    DashAiReciteAttemptCard,
    SessionAnalysisModal,
    WorkspaceAiReciteResultModal,
    AdvancedAnalyticsModal,
    SessionVoiceAssistant,
    DashboardAchievementsWidget,
    AchievementsPanel,
    AchievementUnlockToast,
  },
  props: {
    auth: { type: Object, default: () => ({}) },
    initialData: { type: Object, default: null },
  },
  data() {
    const postSessionMarker = peekDashboardRefreshAfterSession()
    const forceFresh = !!postSessionMarker
    const initial = forceFresh ? null : this.sanitizePayload(this.initialData)
    return {
      data: initial,
      loading: !initial,
      error: false,
      failureKind: 'failure',
      chartDays: 30,
      chartReady: true,
      reduceMotion: false,
      lastSyncedAt: initial?.meta?.generated_at || null,
      syncState: initial ? 'ready' : 'loading',
      lastDashboardFetchedAt: initial ? Date.now() : 0,
      lastChartFingerprint: '',
      dashboardQuietTtlMs: 45000,
      postSessionCompletedSessionId: Number(postSessionMarker?.completedSessionId || 0) || null,
      visibilityHandler: null,
      focusHandler: null,
      escapeHandler: null,
      drawerMode: null,
      drawerItems: [],
      drawerLoading: false,
      drawerError: false,
      drawerRequestId: 0,
      drawerReturnFocus: null,
      dashboardRequestId: 0,
      activityFilter: 'all',
      drawerAiSearch: '',
      drawerAiBandFilter: 'all',
      darkTheme: false,
      themeObserver: null,
      activeSessionSnapshot: null,
      analysisModalOpen: false,
      analysisLoading: false,
      analysisError: false,
      analysisView: null,
      analysisSourceKind: null,
      analysisSourceId: null,
      analysisSourceKey: '',
      analysisRequestId: 0,
      advancedAnalyticsOpen: false,
      aiReciteStats: initial?.ai_recite_stats || null,
      aiReciteLoading: false,
      aiReciteError: false,
      aiReciteRequestId: 0,
      sessionVoiceOpen: false,
      toastMessage: '',
      toastTimer: null,
      achievementUnlockQueue: [],
      achievementDrawerItems: [],
      achievementDrawerTiers: [],
      achievementNotifiedIds: {},
      support: null,
      supportLoading: false,
      supportError: '',
      assignmentSavingId: 0,
      assignmentCompletionMessage: '',
      assignmentCompletionTimer: null,
      assignmentFailedItem: null,
      historyItems: [],
      historyLoading: false,
      historyError: false,
      historyFilter: 'all',
      historyPage: 1,
      historyExpanded: false,
      historyPreviewCount: 5,
      revisitAyahText: {},
      expandedAttemptId: null,
      expandedLoading: false,
      expandedError: false,
      expandedComparison: null,
      expandedDetailCache: {},
      collapsedSections: {},
      collapsedCards: {},
    }
  },
  computed: {
    dashboardTheme() {
      if (typeof document === 'undefined') return this.darkTheme ? 'dark' : 'light'
      return document.documentElement.getAttribute('data-theme') || (this.darkTheme ? 'dark' : 'light')
    },
    memorisationUrl() {
      return this.auth?.memorisation_url || '/memorisation'
    },
    freshMemoriseHref() {
      return memorisationGoalHref(this.memorisationUrl, 'memorise')
    },
    dailyMutqinEntryHref() {
      const practice = this.data?.daily_revision?.recommended_practice
        || this.data?.recommended_next
        || null
      const recommendation = Number(practice?.id || practice?.recommendation_id || 0)
      const surah = Number(
        practice?.surah_number
        || practice?.surah
        || this.journeyContinue?.surah_number
        || this.data?.continue?.surah_number
        || 0,
      )
      const from = Number(
        practice?.ayah_start
        || practice?.from
        || this.journeyContinue?.ayah_start
        || this.data?.continue?.ayah_start
        || 0,
      )
      const to = Number(
        practice?.ayah_end
        || practice?.to
        || this.journeyContinue?.ayah_end
        || this.data?.continue?.ayah_end
        || from
        || 0,
      )
      return dailyMutqinHref(this.memorisationUrl, {
        recommendation: recommendation || undefined,
        surah: surah || undefined,
        from: from || undefined,
        to: to || undefined,
      })
    },
    todaysFocusHint() {
      const focus = this.data?.retention?.todays_focus
      if (focus?.detail) {
        const label = String(focus.label || '').trim()
        const detail = String(focus.detail || '').trim()
        if (label && detail) return `${label}: ${detail}`
        return detail || label || ''
      }
      return ''
    },
    testRecitationHref() {
      return memorisationGoalHref(this.memorisationUrl, 'test')
    },
    canUseAdvancedAnalytics() {
      return this.auth?.advanced_analytics_enabled === true
    },
    showLearnerTeacherSection() {
      return this.auth?.learner_teacher_section_enabled === true
        && (this.supportLoading || this.support !== null)
    },
    savedSessionsHref() {
      const base = this.memorisationUrl.split('?')[0]
      return `${base}?panel=saved`
    },
    ownerId() {
      return Number(this.auth?.id || 0)
    },
    greetingText() {
      const name = this.data?.welcome?.first_name
        || this.auth?.first_name
        || String(this.auth?.name || '').split(/\s+/)[0]
        || this.t('dashboard.dear_friend')
      return this.t('dashboard.greeting', { name })
    },
    learnerFirstName() {
      return this.data?.welcome?.first_name
        || this.auth?.first_name
        || String(this.auth?.name || '').split(/\s+/)[0]
        || ''
    },
    continueCta() {
      const key = this.data?.continue?.cta_key
      if (key) {
        const translated = this.t(`dashboard.${key}`)
        if (translated && translated !== `dashboard.${key}`) return translated
      }
      return this.data?.continue?.cta_label || this.t('dashboard.cta_start')
    },
    continueHref() {
      const href = String(this.data?.continue?.href || '').trim()
      return href || this.memorisationUrl
    },
    journey() {
      return this.data?.journey && typeof this.data.journey === 'object'
        ? this.data.journey
        : null
    },
    journeyHasStarted() {
      return !!this.journey?.has_started
    },
    hasMemorisationHistory() {
      if (this.journeyMemorisedCount > 0) return true
      if (Number(this.data?.snapshot?.completed_sessions?.value ?? 0) > 0) return true
      if (Number(this.data?.snapshot?.memorised_ayahs?.value ?? 0) > 0) return true
      if (this.data?.progress?.current_surah_number) return true
      const row = this.data?.continue
      return !!(row?.surah_number || row?.surah_name)
    },
    journeyContinue() {
      if (this.journey?.continue) return this.journey.continue
      if (this.hasMemorisationHistory && this.data?.continue) return this.data.continue
      return null
    },
    journeyContinueHref() {
      const href = String(this.journeyContinue?.href || this.continueHref || '').trim()
      return href || this.memorisationUrl
    },
    journeyContinueLabel() {
      if (this.isLiveContinueAction) return this.t('dashboard.return_session_label')
      return this.t('dashboard.journey_continue_label')
    },
    journeyContinueCta() {
      if (this.isLiveContinueAction) return this.t('dashboard.return_session_now')
      const key = this.journeyContinue?.cta_key
      if (key) {
        const translated = this.t(`dashboard.${key}`)
        if (translated && translated !== `dashboard.${key}`) return translated
      }
      return this.t('dashboard.journey_continue_cta')
    },
    journeyMemorisedCount() {
      return Math.max(
        Number(this.journey?.overall?.memorised_ayah_count ?? 0),
        Number(this.data?.progress?.memorised_ayah_count ?? 0),
        Number(this.data?.snapshot?.memorised_ayahs?.value ?? 0),
        Number(this.data?.snapshot?.completed_ayahs?.value ?? 0),
      )
    },
    journeyOverallPercent() {
      return Number(this.journey?.overall?.percent ?? 0)
    },
    journeyOverallDisplay() {
      return progressBarDisplay(this.journeyOverallPercent)
    },
    hifzLearningCount() {
      const progress = this.data?.progress || {}
      const cont = this.journeyContinue || {}
      const explicit = Math.max(
        Number(progress.learning_ayah_count ?? 0),
        Number(cont.learning_ayah_count ?? 0),
      )
      if (explicit > 0) return explicit
      const start = Number(progress.ayah_start || cont.ayah_start || 0)
      const end = Number(progress.ayah_end || cont.ayah_end || start)
      return start > 0 && end >= start ? (end - start + 1) : 0
    },
    hifzGlanceStats() {
      return [
        {
          key: 'memorised',
          label: this.t('dashboard.glance_memorised_label'),
          value: this.journeyMemorisedCount,
          icon: 'bi bi-stars',
        },
        {
          key: 'learning',
          label: this.t('dashboard.glance_learning_label'),
          value: this.hifzLearningCount,
          icon: 'bi bi-book-half',
        },
      ]
    },
    showJourneyOverall() {
      return this.journeyMemorisedCount > 0 || this.journeyOverallPercent > 0
    },
    journeyReview() {
      const review = this.journey?.review
      if (!review || !review.surah_name || !review.href) return null
      return review
    },
    currentlyLearningText() {
      const progress = this.data?.progress
      const cont = this.journeyContinue
      const surah = progress?.current_surah_name || cont?.surah_name || ''
      const start = Number(progress?.ayah_start || cont?.ayah_start || 0)
      const end = Number(progress?.ayah_end || cont?.ayah_end || start)
      if (start <= 0) return ''
      const range = start === end
        ? this.t('dashboard.ayah_n', { n: start })
        : this.t('dashboard.ayah_range', { start, end })
      if (surah) return `${surah} · ${range}`
      return this.t('dashboard.currently_learning_range', { range })
    },
    heroProgressSummary() {
      const parts = []
      const memorised = this.journeyMemorisedCount
      const learning = this.hifzLearningCount
      if (memorised > 0) {
        parts.push(this.t('dashboard.hero_memorised_summary', { count: memorised }))
      }
      if (this.currentlyLearningText) {
        parts.push(this.currentlyLearningText)
      } else if (learning > 0) {
        parts.push(this.t('dashboard.hero_learning_summary', { count: learning }))
      }
      if (!parts.length && this.primaryContinueAction?.title) {
        parts.push(this.primaryContinueAction.title)
      }
      return parts.join(' · ')
    },
    showHeroProgressSummary() {
      if (!this.heroProgressSummary) return false
      if (this.primaryContinueAction?.kind === 'fresh') return false
      const action = this.primaryContinueAction
      if (!action) return true
      const title = String(action.title || '').trim()
      const range = String(action.range || action.hint || '').trim()
      const summary = this.heroProgressSummary
      if (title && summary.includes(title)) return false
      if (range && summary.includes(range)) return false
      if (this.currentlyLearningText && summary === this.currentlyLearningText && (title || range)) {
        return false
      }
      return true
    },
    showMurajaahSection() {
      return true
    },
    learningMetrics() {
      const metrics = this.data?.learning?.metrics
      const empty = {
        memorised: { value: 0, period_days: null },
        revised: { value: 0, period_days: this.chartDays },
        recited: { value: 0, period_days: this.chartDays, repeats: 0 },
        ai_checks: { value: 0, period_value: 0 },
      }
      return metrics && typeof metrics === 'object' ? { ...empty, ...metrics } : empty
    },
    learningCards() {
      const metrics = this.learningMetrics
      const revisedHint = metrics.revised?.capped
        ? this.t('dashboard.learning_capped')
        : this.t('dashboard.learning_revised_hint')
      const recitedHint = Number(metrics.recited?.repeats || 0) > 0
        ? this.t('dashboard.learning_repeats', { n: metrics.recited.repeats })
        : this.t('dashboard.learning_recited_hint')
      const recitedNote = metrics.recited?.capped
        ? `${recitedHint} ${this.t('dashboard.learning_capped')}`
        : recitedHint
      return [
        { key: 'memorised', value: Number(metrics.memorised?.value || 0), label: this.t('dashboard.learning_memorised'), hint: this.t('dashboard.learning_memorised_hint'), action: 'hifz' },
        { key: 'revised', value: Number(metrics.revised?.value || 0), label: this.t('dashboard.learning_revised'), hint: revisedHint, action: 'revision' },
        { key: 'recited', value: Number(metrics.recited?.value || 0), label: this.t('dashboard.learning_recited'), hint: recitedNote, action: 'recitation' },
        { key: 'ai_checks', value: Math.max(Number(metrics.ai_checks?.value || 0), Number(this.aiReciteStats?.total_attempts || 0)), label: this.t('dashboard.learning_ai_checks'), hint: this.t('dashboard.learning_ai_checks_hint'), action: 'ai' },
      ]
    },
    comparableSummary() {
      const summary = this.data?.learning?.comparable
      if (!summary || summary.average == null || Number(summary.attempts || 0) < 2) return null
      return summary
    },
    showMurajaahEmpty() {
      return this.murajaahPreview.length === 0
    },
    optionalReviewSuggestion() {
      if (this.murajaahPreview.length) return null
      const progress = this.data?.progress
      const cont = this.journeyContinue
      const surahName = progress?.current_surah_name || cont?.surah_name
      const start = Number(progress?.ayah_start || cont?.ayah_start || 0)
      if (!surahName || !(start > 0)) return null
      return {
        title: `${surahName} · ${this.t('dashboard.ayah_n', { n: start })}`,
        href: this.reviewNowHref({
          surah_number: Number(progress?.current_surah_number || cont?.surah_number || 0),
          ayah_number: start,
          href: cont?.href,
        }),
      }
    },
    showAiReciteSection() {
      return !!this.data
    },
    showPracticeMetrics() {
      return this.weeklyAnalytics.some((item) => Number(item.value ?? 0) > 0)
    },
    showWeeklySectionHint() {
      return this.showWeeklyEmpty || !this.showPracticeMetrics
    },
    earlyProgressMessage() {
      const pct = this.journeyOverallPercent
      if (pct <= 0 || pct > 10) return ''
      return this.t('dashboard.early_progress_message')
    },
    isSavedSessionContinue() {
      // Both a live paused/interrupted session and a deliberately ended-early
      // portion are saved work. Give each the same unambiguous return surface.
      if (this.liveReturnSession) return true
      const type = String(this.data?.continue?.action_type || '')
      return type === 'resume_session'
        || type === 'continue_session'
        || type === 'continue_incomplete'
    },
    savedSessionContinueSource() {
      if (this.liveReturnSession) return this.liveReturnSession
      if (this.isSavedSessionContinue) return this.data?.continue || {}
      return null
    },
    revisionPrimaryTarget() {
      const review = this.journeyReview
      if (review?.href) {
        const start = Number(review.ayah_start || review.ayah_number || 0)
        const end = Number(review.ayah_end || start)
        const range = start > 0
          ? (start === end
            ? this.t('dashboard.ayah_n', { n: start })
            : this.t('dashboard.ayah_range', { start, end }))
          : ''
        return {
          href: review.href,
          title: range ? `${review.surah_name} · ${range}` : review.surah_name,
        }
      }
      const item = this.murajaahPreview[0]
      if (!item) return null
      const href = this.reviewNowHref(item)
      if (!href) return null
      return {
        href,
        title: `${item.surah_name} · ${this.t('dashboard.ayah_n', { n: item.ayah_number })}`,
      }
    },
    showOptionalReviewAside() {
      const suggestion = this.optionalReviewSuggestion
      if (!suggestion?.href) return false
      return suggestion.href !== this.primaryContinueAction?.href
    },
    secondaryRevisionAction() {
      const primary = this.primaryContinueAction
      if (!primary || primary.kind === 'revise' || primary.kind === 'fresh') return null
      const review = this.revisionPrimaryTarget
      if (!review?.href || !review?.title) return null
      if (review.href === primary.href) return null
      return review
    },
    primaryContinueAction() {
      const journey = this.journeyMemorisationAction
      const review = this.revisionPrimaryTarget
      const row = this.journeyContinue || {}
      const kind = pickDashboardPrimaryKind({
        hasSaved: this.isSavedSessionContinue,
        review,
        journey,
        continueActionType: String(row.action_type || this.data?.continue?.action_type || ''),
        remembered: row.remembered_count,
        rangeTotal: row.range_ayah_count,
      })
      if (kind === 'saved') {
        const source = this.savedSessionContinueSource || {}
        const title = this.continueSessionTitle(source)
        return {
          kind: 'saved',
          href: String(source.href || this.continueHref || this.memorisationUrl).trim(),
          label: this.t('dashboard.saved_session_label'),
          title,
          hint: this.t('dashboard.saved_session_hint'),
          cta: this.t('dashboard.cta_continue'),
          icon: 'bi bi-bookmark-heart-fill',
          ariaLabel: `${this.t('dashboard.saved_session_label')}. ${title}. ${this.t('dashboard.saved_session_hint')}`,
        }
      }
      if (kind === 'revise' && review) {
        return {
          kind: 'revise',
          href: review.href,
          label: this.t('dashboard.journey_review_label'),
          title: review.title,
          hint: this.t('memorisation.sessionGoal.reviseHint'),
          cta: this.t('dashboard.journey_review_cta'),
          icon: 'bi bi-arrow-repeat',
          ariaLabel: `${this.t('dashboard.journey_review_label')}. ${review.title}. ${this.t('memorisation.sessionGoal.reviseHint')}`,
        }
      }
      if (kind === 'journey' && journey) {
        const why = String(
          this.journeyContinue?.why_summary
          || this.data?.continue?.why_summary
          || this.data?.recommended_next?.why_summary
          || '',
        ).trim()
        const focusHint = this.todaysFocusHint
        const continueLabel = this.t('dashboard.continue_memorising_label') || 'Continue memorising'
        return {
          kind: 'journey',
          href: this.dailyMutqinEntryHref,
          label: continueLabel,
          title: journey.title,
          hint: focusHint || why || null,
          range: (focusHint || why) ? null : this.continueRangeLabel(this.journeyContinue || this.data?.progress),
          cta: this.t('dashboard.cta_continue') || 'Continue',
          icon: 'bi bi-journal-bookmark',
          ariaLabel: `${continueLabel}. ${journey.title}`,
        }
      }
      const focusHint = this.todaysFocusHint
      const startLabel = this.t('dashboard.start_practising_label') || 'Start practising'
      const startTitle = this.t('dashboard.start_practising_title') || 'Al-Fatihah · Ayahs 1–5'
      return {
        kind: 'fresh',
        href: this.dailyMutqinEntryHref,
        label: startLabel,
        title: startTitle,
        hint: focusHint || this.t('dashboard.start_practising_hint') || this.t('memorisation.sessionGoal.freshHint'),
        cta: this.t('dashboard.cta_start') || 'Start',
        icon: 'bi bi-journal-bookmark',
        ariaLabel: `${startLabel}. ${startTitle}`,
      }
    },
    journeyMemorisationAction() {
      if (!this.journeyContinue) return null
      return {
        kind: 'memorisation',
        href: this.journeyContinueHref,
        title: this.journeyContinue.surah_name || this.t('dashboard.start_session'),
        label: this.journeyContinueLabel,
        cta: this.journeyContinueCta,
      }
    },
    murajaahAllItems() {
      const all = this.data?.weaknesses?.all_items
      if (Array.isArray(all) && all.length) return all
      const items = this.data?.weaknesses?.items
      return Array.isArray(items) ? items : []
    },
    revisitItems() {
      const items = this.data?.learning?.revisit
      if (Array.isArray(items)) return items.slice(0, 3)
      return this.sortMurajaahByUrgency(this.murajaahAllItems).slice(0, 3)
    },
    murajaahPreview() {
      return this.revisitItems
    },
    murajaahTotal() {
      const total = Number(this.data?.weaknesses?.total ?? 0)
      return total > 0 ? total : this.murajaahAllItems.length
    },
    murajaahSectionSubtitle() {
      if (this.murajaahPreview.length) {
        return this.t('dashboard.journey_murajaah_hint', { count: this.murajaahTotal })
      }
      return this.t('dashboard.strengthen_subtitle')
    },
    showMurajaahViewAll() {
      return this.murajaahTotal > this.murajaahPreview.length
    },
    isLiveContinueAction() {
      const type = String(this.data?.continue?.action_type || '')
      return type === 'resume_session' || type === 'continue_session'
    },
    liveReturnSession() {
      if (!this.isLiveContinueAction || !this.data?.continue) return null
      const snap = this.activeSessionSnapshot
      const base = this.data.continue
      const fromKey = String(snap?.activeVerseKey || snap?.activeKey || '')
      const snapAyah = Number(fromKey.split(':')[1] || 0)
      const lastAyah = Number(base.last_ayah || snapAyah || 0) || null
      return {
        ...base,
        surah_name: base.surah_name || null,
        last_ayah: lastAyah,
        last_activity_at: base.last_activity_at
          || (snap?.savedAt ? new Date(Number(snap.savedAt)).toISOString() : null),
      }
    },
    recommendedNext() {
      const next = this.data?.recommended_next
      if (!next || !next.surah_number || !next.ayah_start || !next.href) return null
      return next
    },
    dailyRevision() {
      const revision = this.data?.daily_revision
      return revision && typeof revision === 'object' ? revision : {}
    },
    dailyDueItems() {
      return Array.isArray(this.dailyRevision.due_items) ? this.dailyRevision.due_items : []
    },
    dailyDueAllItems() {
      const items = this.dailyRevision.due_all_items
      return Array.isArray(items) ? items : this.dailyDueItems
    },
    dailyWeakItems() {
      const items = this.dailyRevision.weak_items
      return Array.isArray(items) ? items : this.murajaahPreview
    },
    dailyWeakAllItems() {
      const items = this.dailyRevision.weak_all_items
      return Array.isArray(items) ? items : this.dailyWeakItems
    },
    dailyRecommendedPractice() {
      const item = this.dailyRevision.recommended_practice || this.recommendedNext
      return item?.surah_name && item?.ayah_start && item?.href ? item : null
    },
    dailyRecommendedRange() {
      const item = this.dailyRecommendedPractice
      if (!item) return ''
      const start = Number(item.ayah_start || 0)
      const end = Number(item.ayah_end || start)
      return start === end
        ? this.t('dashboard.ayah_n', { n: start })
        : this.t('dashboard.ayah_range', { start, end })
    },
    dailyDueCount() {
      const total = Number(this.dailyRevision.due_total)
      if (Number.isFinite(total) && total >= 0) return total
      return this.dailyDueAllItems.length
    },
    dailyWeakCount() {
      const total = Number(this.dailyRevision.weak_total)
      if (Number.isFinite(total) && total >= 0) return total
      return this.dailyWeakAllItems.length
    },
    snapshotCards() {
      const snap = this.data?.snapshot || {}
      return METRIC_META.map((meta) => {
        const row = snap[meta.key] || {}
        const value = Number(row.value ?? 0)
        let labelKey = meta.labelKey
        let hintKey = meta.hintKey
        if (meta.key === 'memorised_ayahs' && value === 0) {
          labelKey = 'metric_completed_ayahs'
          hintKey = meta.altHintKey || meta.hintKey
        }
        const change = row.change_7d != null ? Number(row.change_7d) : null
        let deltaLabel = null
        if (change != null && change > 0) {
          deltaLabel = this.t('dashboard.change_7d', { n: change })
        }
        return {
          key: meta.key,
          tone: meta.tone,
          icon: meta.icon,
          label: this.t(`dashboard.${labelKey}`),
          hint: this.t(`dashboard.${hintKey}`),
          value,
          deltaLabel,
          drawer: meta.drawer || null,
          href: meta.hrefPanel === 'saved' ? this.savedSessionsHref : null,
        }
      })
    },
    showHeroHint() {
      return !!this.primaryContinueAction
    },
    murajaahSectionHint() {
      if (this.murajaahTotal > 1) {
        return this.t('dashboard.journey_murajaah_hint', { count: this.murajaahTotal })
      }
      return this.t('dashboard.murajaah_section_hint')
    },
    continueMetaText() {
      const progress = this.data?.progress
      if (!progress) return ''
      const parts = []
      const memorised = Number(progress.memorised_ayah_count ?? 0)
      const learning = Number(progress.learning_ayah_count ?? 0)
      if (memorised > 0) {
        parts.push(`${memorised} ${this.t('dashboard.legend_memorised').toLowerCase()}`)
      }
      if (learning > 0) {
        parts.push(`${learning} ${this.t('dashboard.legend_learning').toLowerCase()}`)
      }
      const start = Number(progress.ayah_start || 0)
      const end = Number(progress.ayah_end || 0)
      if (start > 0 && end >= start) {
        parts.push(this.t('dashboard.ayah_range', { start, end }))
      }
      return parts.join(' · ')
    },
    positionDetailText() {
      const progress = this.data?.progress
      if (!progress?.current_surah_number) return ''
      const parts = []
      const memorised = Number(progress.memorised_ayah_count ?? 0)
      const learning = Number(progress.learning_ayah_count ?? 0)
      const total = Number(progress.surah_ayah_count ?? 0)
      if (memorised > 0 || learning > 0) {
        parts.push(`${memorised} ${this.t('dashboard.legend_memorised').toLowerCase()} · ${learning} ${this.t('dashboard.legend_learning').toLowerCase()}`)
      }
      if (total > 0 && this.surahProgress) {
        parts.push(`${this.surahProgress.practised} / ${total} ${this.t('dashboard.surah_completion').toLowerCase()}`)
      }
      const start = Number(progress.ayah_start || 0)
      const end = Number(progress.ayah_end || 0)
      if (start > 0 && end >= start) {
        parts.push(this.t('dashboard.ayah_range', { start, end }))
      }
      return parts.join(' · ')
    },
    showWeeklyEmpty() {
      if (this.data?.chart?.is_empty) return true
      return !this.showPracticeMetrics
    },
    weeklyAnalytics() {
      const period = this.data?.chart?.period_summary || {}
      const week = this.data?.week_summary || {}
      const stats = period.is_empty === false || Number(period.sessions ?? 0) > 0
        ? period
        : week
      return [
        {
          key: 'week_sessions',
          label: this.t('dashboard.analytics_week_sessions'),
          hint: this.t('dashboard.analytics_week_sessions_hint'),
          value: Number(stats.sessions ?? 0),
          drawer: 'activity',
          filter: 'session',
          icon: 'bi bi-journal-check',
        },
        {
          key: 'week_ayahs',
          label: this.t('dashboard.analytics_week_ayahs'),
          hint: this.t('dashboard.analytics_week_ayahs_hint'),
          value: Number(stats.ayahs_practised ?? 0),
          drawer: 'activity',
          filter: 'all',
          icon: 'bi bi-book',
        },
        {
          key: 'active_days',
          label: this.t('dashboard.analytics_active_days'),
          hint: this.t('dashboard.analytics_active_days_hint'),
          value: Number(stats.active_days ?? 0),
          drawer: 'activity',
          filter: 'all',
          icon: 'bi bi-calendar-check',
        },
      ]
    },
    aiReciteView() {
      return buildDashboardAiReciteStatsView(this.aiReciteStats, this.t.bind(this))
    },
    aiReciteScore() {
      return this.aiReciteView?.score || null
    },
    aiReciteFacts() {
      const preferred = ['total', 'ayahs']
      const cards = this.aiReciteView?.cards || []
      return preferred
        .map((key) => cards.find((card) => card.key === key))
        .filter((card) => card && card.value && card.value !== '—')
    },
    aiReciteSummaryLine() {
      return this.aiReciteFacts
        .map((fact) => `${fact.value} ${String(fact.label || '').toLowerCase()}`)
        .filter(Boolean)
        .join(' · ')
    },
    aiReciteFocus() {
      return this.aiReciteView?.focus || []
    },
    aiReciteHolding() {
      return !!this.aiReciteView?.holding
    },
    aiRecitePreview() {
      return (this.aiReciteView?.recent || []).slice(0, 3)
    },
    aiReciteUnifiedCards() {
      const recent = this.aiRecitePreview.map((item) => ({
        ...item,
        card_kind: 'attempt',
        card_key: `attempt-${item.id}`,
      }))
      const covered = new Set(
        recent
          .filter((item) => Number(item.ayah_start) > 0 && Number(item.ayah_start) === Number(item.ayah_end))
          .map((item) => `${Number(item.surah_number)}:${Number(item.ayah_start)}`)
      )
      const focus = this.aiReciteFocus
        .filter((item) => !covered.has(`${Number(item.surah_number)}:${Number(item.ayah)}`))
        .map((item) => ({
          ...item,
          card_kind: 'focus',
          card_key: `focus-${item.key}`,
          id: item.key,
          accuracy_percent: item.accuracy,
          band: item.tone,
          ayah_start: item.ayah,
          ayah_end: item.ayah,
          ayah_number: item.ayah,
          occurred_at: item.last_attempted_at || '',
          has_word_alignment: false,
          flagged_word_count: 0,
          has_audio: false,
        }))
      return [...recent, ...focus]
    },
    aiReciteVisibleCards() {
      // Compact feedback lists attempts first (max 3). Focus rows stay available
      // only when there are no recent attempts to show.
      const cards = this.aiReciteUnifiedCards
      const attempts = cards.filter((item) => item.card_kind === 'attempt')
      if (attempts.length) return attempts
      return cards.filter((item) => item.card_kind === 'focus').slice(0, 3)
    },
    filteredHistory() {
      return Array.isArray(this.historyItems) ? this.historyItems : []
    },
    historyVisible() {
      if (this.historyExpanded) return this.filteredHistory
      return this.filteredHistory.slice(0, this.historyPreviewCount)
    },
    historyHasMore() {
      return !this.historyExpanded && this.filteredHistory.length > this.historyPreviewCount
    },
    historyCanCollapse() {
      return this.historyExpanded && this.filteredHistory.length > this.historyPreviewCount
    },
    historyGroups() {
      const groups = []
      this.historyVisible.forEach((item) => {
        const key = String(item.occurred_at || '').slice(0, 10) || 'undated'
        let group = groups.find((entry) => entry.key === key)
        if (!group) {
          group = { key, label: this.formatAbsoluteDate(item.occurred_at) || key, items: [] }
          groups.push(group)
        }
        group.items.push(item)
      })
      return groups
    },
    aiReciteImprovement() {
      const card = (this.aiReciteView?.cards || []).find((item) => item.key === 'improvement')
      if (!card?.value) return ''
      return this.t('dashboard.ai_recite.results_change', { value: card.value })
    },
    weeklyInsightText() {
      const week = this.data?.week_summary
      if (!week || week.is_empty) return ''
      const sessions = Number(week.sessions ?? 0)
      const activeDays = Number(week.active_days ?? 0)
      if (activeDays >= 2) {
        return this.t('dashboard.weekly_insight_active_days', { days: activeDays })
      }
      if (sessions >= 2) {
        return this.t('dashboard.weekly_insight_sessions', { sessions })
      }
      return ''
    },
    surahProgress() {
      const progress = this.data?.progress
      if (!progress?.current_surah_number) return null
      const display = progressBarDisplay(Number(progress.surah_completion_percent ?? 0))
      const total = Number(progress.surah_ayah_count || 0)
      const practised = Number(
        progress.surah_practised_ayah_count
        ?? ((progress.memorised_ayah_count || 0) + (progress.learning_ayah_count || 0))
      )
      return {
        value: display.percent,
        practised,
        total,
        fillWidth: display.fillWidth,
        hasProgress: display.hasProgress,
      }
    },
    secondaryCompletion() {
      // Range/plan bars stay below; surah progress lives under the surah name.
      const progress = this.data?.progress
      if (!progress) return null
      if (progress.range_completion_percent != null) {
        return this.completionBar(this.t('dashboard.range_completion'), progress.range_completion_percent)
      }
      if (progress.active_plan_completion_percent != null) {
        return this.completionBar(this.t('dashboard.plan_completion'), progress.active_plan_completion_percent)
      }
      return null
    },
    chartPalette() {
      const root = typeof document !== 'undefined' ? document.documentElement : null
      const read = (name, fallback) => {
        if (!root || typeof getComputedStyle !== 'function') return fallback
        const value = getComputedStyle(root).getPropertyValue(name).trim()
        return value || fallback
      }
      const accent = read('--accent', '#8b5e3c')
      const accentStrong = read('--accent-strong', '#765035')
      const text = read('--text', '#1f1a17')
      const textMuted = read('--text-muted', '#554c45')
      const surfaceStrong = read('--surface-strong', '#ffffff')
      const border = read('--border', 'rgba(78, 58, 38, 0.24)')
      const success = read('--success', '#2d6a4f')
      const successStrong = read('--success-strong', '#245a42')

      if (this.darkTheme) {
        return {
          ayahs: success,
          ayahsHover: successStrong,
          sessions: accent,
          sessionsHover: accentStrong,
          muted: textMuted,
          ink: text,
          tooltipBg: read('--surface-strong', '#121212'),
          tooltipBorder: border,
          grid: `color-mix(in srgb, ${border} 35%, transparent)`,
        }
      }
      return {
        ayahs: success,
        ayahsHover: successStrong,
        sessions: accent,
        sessionsHover: accentStrong,
        muted: textMuted,
        ink: text,
        tooltipBg: surfaceStrong,
        tooltipBorder: border,
        grid: `color-mix(in srgb, ${border} 35%, transparent)`,
      }
    },
    chartInstanceKey() {
      const points = this.data?.chart?.points || []
      const first = points[0]?.date || 'none'
      const last = points[points.length - 1]?.date || 'none'
      return `chart-${this.chartDays}-${points.length}-${first}-${last}`
    },
    chartSummaryText() {
      const chart = this.data?.chart || {}
      const key = String(chart.summary_key || '').trim()
      if (!key) return ''
      const params = chart.summary_params && typeof chart.summary_params === 'object'
        ? chart.summary_params
        : {
            days: this.chartDays,
            ayahs: 0,
            sessions: 0,
            active_days: 0,
          }
      const translated = this.t(`dashboard.${key}`, params)
      return translated === `dashboard.${key}` ? String(chart.summary || '') : translated
    },
    chartData() {
      const points = this.data?.chart?.points || []
      const palette = this.chartPalette
      return {
        labels: points.map((point) => this.shortDate(point.date)),
        datasets: [
          {
            label: this.t('dashboard.chart_ayahs'),
            data: points.map((point) => Number(point.primary || point.ayahs_memorised || 0)),
            backgroundColor: palette.ayahs,
            hoverBackgroundColor: palette.ayahsHover,
            borderRadius: 6,
            maxBarThickness: this.chartDays === 7 ? 22 : 14,
            categoryPercentage: 0.82,
            barPercentage: 0.92,
          },
          {
            label: this.t('dashboard.chart_sessions'),
            data: points.map((point) => Number(point.secondary || point.sessions_completed || 0)),
            backgroundColor: palette.sessions,
            hoverBackgroundColor: palette.sessionsHover,
            borderRadius: 6,
            maxBarThickness: this.chartDays === 7 ? 22 : 14,
            categoryPercentage: 0.82,
            barPercentage: 0.92,
          },
        ],
      }
    },
    chartOptions() {
      const points = this.data?.chart?.points || []
      const palette = this.chartPalette
      return {
        responsive: true,
        maintainAspectRatio: false,
        animation: this.reduceMotion ? false : { duration: 480, easing: 'easeOutQuart' },
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            display: true,
            labels: {
              boxWidth: 10,
              boxHeight: 10,
              color: palette.ink,
              font: { size: 11, weight: '500' },
              padding: 10,
              usePointStyle: true,
              pointStyle: 'rectRounded',
            },
          },
          tooltip: {
            backgroundColor: palette.tooltipBg,
            titleColor: palette.ink,
            bodyColor: palette.ink,
            borderColor: palette.tooltipBorder,
            borderWidth: 1,
            padding: 10,
            cornerRadius: 10,
            displayColors: false,
            titleFont: { weight: '500', size: 12 },
            filter: (item) => item.datasetIndex === 0,
            callbacks: {
              title: (items) => {
                const index = items?.[0]?.dataIndex ?? 0
                const point = points[index] || {}
                const ayahs = Number(point.primary ?? point.ayahs_memorised ?? 0)
                const sessions = Number(point.secondary ?? point.sessions_completed ?? 0)
                return this.t('dashboard.chart_tooltip', {
                  date: this.tooltipDate(point.date),
                  ayahs,
                  sessions,
                })
              },
              label: () => null,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: this.chartDays === 7 ? 7 : 6,
              color: palette.muted,
              font: { size: 10, weight: '400' },
            },
          },
          y: {
            beginAtZero: true,
            ticks: {
              precision: 0,
              color: palette.muted,
              font: { size: 10, weight: '400' },
            },
            grid: { color: palette.grid },
          },
        },
      }
    },
    drawerOpen() {
      return !!this.drawerMode
    },
    achievementsWidget() {
      return this.data?.achievements || null
    },
    localeCode() {
      return document.documentElement?.lang || 'en'
    },
    drawerTitleId() {
      return 'dash-drawer-title'
    },
    drawerTitle() {
      const key = DRAWER_TITLES[this.drawerMode]
      return key ? this.t(`dashboard.${key}`) : ''
    },
    drawerSubtitle() {
      const key = DRAWER_SUBTITLES[this.drawerMode]
      return key ? this.t(`dashboard.${key}`) : ''
    },
    drawerIcon() {
      return DRAWER_ICONS[this.drawerMode] || ''
    },
    drawerCountLabel() {
      if (this.drawerMode === 'achievements') return ''
      if (this.drawerLoading || this.drawerError) return ''
      const count = this.visibleDrawerItems.length
      if (count <= 0) return ''
      return this.t('dashboard.drawer_count', { n: count })
    },
    drawerEmptyMessage() {
      if (
        this.drawerMode === 'activity'
        && this.activityFilter !== 'all'
        && this.drawerItems.length
        && !this.visibleDrawerItems.length
      ) {
        return this.t('dashboard.activity_filter_empty')
      }
      const key = DRAWER_EMPTY[this.drawerMode]
      return key ? this.t(`dashboard.${key}`) : ''
    },
    activityFilters() {
      return [
        { key: 'all', label: this.t('dashboard.activity_filter_all') },
        { key: 'session', label: this.t('dashboard.activity_filter_sessions') },
        { key: 'ai_check', label: this.t('dashboard.activity_filter_ai') },
      ]
    },
    aiCheckBandFilters() {
      return [
        { key: 'all', label: this.t('dashboard.ai_history_filter_all') },
        { key: 'weak', label: this.t('dashboard.drawer_result_weak') },
        { key: 'mixed', label: this.t('dashboard.drawer_result_mixed') },
        { key: 'strong', label: this.t('dashboard.drawer_result_strong') },
      ]
    },
    visibleDrawerItems() {
      if (this.drawerMode === 'ai_checks') {
        let items = Array.isArray(this.drawerItems) ? [...this.drawerItems] : []
        const q = String(this.drawerAiSearch || '').trim().toLowerCase()
        if (q) {
          items = items.filter((item) => {
            const name = String(item?.surah_name || '').toLowerCase()
            const surah = String(item?.surah_number || '')
            const range = String(this.formatItemRange(item) || '').toLowerCase()
            const accuracy = String(item?.accuracy_percent ?? '')
            return name.includes(q) || surah.includes(q) || range.includes(q) || accuracy.includes(q)
          })
        }
        if (this.drawerAiBandFilter !== 'all') {
          items = items.filter((item) => String(item?.band || '').toLowerCase() === this.drawerAiBandFilter)
        }
        return items
      }
      if (this.drawerMode === 'murajaah' || this.drawerMode === 'due') {
        return this.sortMurajaahByUrgency(this.drawerItems)
      }
      if (this.drawerMode !== 'activity' || this.activityFilter === 'all') {
        return this.drawerItems.filter((item) => String(item?.type || '').toLowerCase() !== 'note')
      }
      return this.drawerItems.filter((item) => {
        const type = String(item?.type || '').toLowerCase()
        if (type === 'note') return false
        if (this.activityFilter === 'session') {
          return type === 'session' || type.startsWith('session_')
        }
        if (this.activityFilter === 'ai_check') {
          return type === 'ai_check' || type === 'ai_recite'
        }
        return true
      })
    },
    weekSummaryText() {
      const week = this.data?.week_summary
      if (!week || week.is_empty) {
        return this.t('dashboard.week_summary_empty')
      }
      return this.t('dashboard.week_summary', {
        sessions: Number(week.sessions || 0),
        ai_checks: Number(week.ai_checks || 0),
        ayahs: Number(week.ayahs_practised || 0),
      })
    },
  },
  async mounted() {
    const postSessionArrival = consumeDashboardRefreshAfterSession()
    this.reduceMotion = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
    this.syncTheme()
    if (typeof MutationObserver !== 'undefined' && typeof document !== 'undefined') {
      this.themeObserver = new MutationObserver(() => {
        this.syncTheme()
        this.chartReady = false
        this.$nextTick(() => { this.chartReady = true })
      })
      this.themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme', 'class'],
      })
    }

    this.refreshActiveSessionSnapshot()
    this.loadLearnerSupport()
    if (postSessionArrival) {
      if (postSessionArrival.saveFailed) {
        this.$nextTick(() => this.showToast(this.t('memorisation.sync.status.failed')))
      }
      await this.retryPendingPostSessionWrites()
      await Promise.allSettled([
        this.fetchDashboard(this.chartDays, { initial: true, force: true }),
        this.loadAiReciteResults(),
      ])
    } else if (!this.data) {
      this.fetchDashboard(this.chartDays, { initial: true })
    }
    // When SSR/initial payload exists, skip an immediate quiet refetch —
    // visibility/focus handlers cover staleness with a TTL.

    this.visibilityHandler = () => {
      if (document.visibilityState === 'visible') {
        this.refreshActiveSessionSnapshot()
        this.loadLearnerSupport()
        this.fetchDashboard(this.chartDays, { quiet: true })
      }
    }
    // Focus often fires with visibilitychange; TTL inside fetchDashboard
    // dedupes the double-hit without dropping intentional refreshes.
    this.focusHandler = () => {
      if (document.visibilityState === 'visible') {
        this.fetchDashboard(this.chartDays, { quiet: true })
      }
    }
    this.escapeHandler = (event) => {
      if (event.key !== 'Escape') return
      if (this.analysisModalOpen) return
      if (this.drawerOpen) this.closeDrawer()
    }
    document.addEventListener('visibilitychange', this.visibilityHandler)
    window.addEventListener('focus', this.focusHandler)
    document.addEventListener('keydown', this.escapeHandler)
    this.unsubscribeNetwork = subscribeNetworkStatus((online) => {
      if (!online) return
      if (readSessionCompletionRetry() || readAiAssessmentRetry()) {
        void this.retryPendingPostSessionWrites().then(() => this.reload(true))
        return
      }
      if (this.error && !this.data) this.reload(true)
    })
    if (!postSessionArrival) this.loadAiReciteResults()
    this.loadLearningHistory()
    this.hydrateRevisitAyahs()
    this.scrollToAiReciteResults()
    this.enqueueAchievementUnlocks(this.data?.achievements?.pending_unlocks)
    this.openAchievementsFromHash()
    trackAckeeEvent(ACKEE_EVENTS.PROGRESS_DASHBOARD_VIEWED)
  },
  beforeUnmount() {
    try { this._dashboardAbort?.abort?.() } catch (_) { /* ignore */ }
    if (typeof this.unsubscribeNetwork === 'function') this.unsubscribeNetwork()
    if (this.visibilityHandler) document.removeEventListener('visibilitychange', this.visibilityHandler)
    if (this.focusHandler) window.removeEventListener('focus', this.focusHandler)
    if (this.escapeHandler) document.removeEventListener('keydown', this.escapeHandler)
    if (this.themeObserver) this.themeObserver.disconnect()
    this.clearToast()
    clearTimeout(this.assignmentCompletionTimer)
    this.syncDrawerBodyLock(false)
  },
  methods: {
    t(key, params) {
      if (typeof this.$t === 'function') return this.$t(key, params)
      return key
    },
    isSectionCollapsed(key) {
      return !!this.collapsedSections?.[key]
    },
    toggleSection(key) {
      this.collapsedSections = {
        ...this.collapsedSections,
        [key]: !this.collapsedSections?.[key],
      }
    },
    isCardCollapsed(key) {
      if (Object.prototype.hasOwnProperty.call(this.collapsedCards || {}, key)) {
        return !!this.collapsedCards[key]
      }
      // Next-to-revisit ayahs start collapsed to keep the page short.
      return String(key).startsWith('revisit:')
    },
    toggleCard(key) {
      const currentlyCollapsed = this.isCardCollapsed(key)
      this.collapsedCards = {
        ...this.collapsedCards,
        [key]: !currentlyCollapsed,
      }
    },
    toggleRevisitCard(itemKey) {
      const key = `revisit:${itemKey}`
      const currentlyCollapsed = this.isCardCollapsed(key)
      const next = { ...this.collapsedCards }
      // Mobile: only one ayah expanded at a time.
      if (currentlyCollapsed && this.isNarrowViewport()) {
        ;(this.revisitItems || []).forEach((item) => {
          next[`revisit:${item.key}`] = true
        })
      }
      next[key] = !currentlyCollapsed
      this.collapsedCards = next
      if (currentlyCollapsed) {
        this.hydrateRevisitAyahs()
      }
    },
    isNarrowViewport() {
      if (typeof window === 'undefined' || !window.matchMedia) return true
      return window.matchMedia('(max-width: 767.98px)').matches
    },
    expandHistory() {
      this.historyExpanded = true
    },
    collapseHistory() {
      this.historyExpanded = false
      this.historyPage = 1
    },
    openSessionVoice() {
      if (!this.auth?.session_voice_enabled || this.sessionVoiceOpen) return
      this.sessionVoiceOpen = true
    },
    closeSessionVoice() {
      this.sessionVoiceOpen = false
    },
    continueRangeLabel(source = {}) {
      const surah = String(source?.surah_name || source?.current_surah_name || '').trim()
      const start = Number(source?.ayah_start || 0)
      const end = Number(source?.ayah_end || start)
      if (start <= 0) return ''
      const range = start === end
        ? this.t('dashboard.ayah_n', { n: start })
        : this.t('dashboard.ayah_range', { start, end })
      if (surah) {
        return this.t('dashboard.currently_learning_with_surah', { surah, range })
      }
      if (start === end) {
        return this.t('dashboard.currently_learning_range', {
          range,
        })
      }
      return this.t('dashboard.currently_learning_range', {
        range,
      })
    },
    continueSessionTitle(source = {}) {
      const surah = String(source?.surah_name || '').trim()
      const start = Number(source?.ayah_start || 0)
      const end = Number(source?.ayah_end || start)
      if (!surah && start <= 0) return this.t('dashboard.start_session')
      const range = start <= 0
        ? ''
        : (start === end
          ? this.t('dashboard.ayah_n', { n: start })
          : this.t('dashboard.ayah_range', { start, end }))
      if (surah && range) return `${surah} · ${range}`
      return surah || range
    },
    murajaahPrimaryMeta(source = {}) {
      const start = Number(source.ayah_start || source.ayah_number || 0)
      const end = Number(source.ayah_end || start || 0)
      if (start > 0 && end >= start) {
        return this.t('dashboard.ayah_range', { start, end })
      }
      if (start > 0) {
        return this.t('dashboard.last_ayah', { n: start })
      }
      return ''
    },
    activeSessionSnapshotKey() {
      return activeSessionSnapshotKey(this.ownerId > 0 ? this.ownerId : null)
    },
    refreshActiveSessionSnapshot() {
      if (typeof sessionStorage === 'undefined') {
        this.activeSessionSnapshot = null
        return
      }
      try {
        const raw = sessionStorage.getItem(this.activeSessionSnapshotKey())
        this.activeSessionSnapshot = raw ? JSON.parse(raw) : null
      } catch {
        this.activeSessionSnapshot = null
      }
    },
    goToLiveSession() {
      const href = this.continueHref
      if (!href) return
      window.location.assign(href)
    },
    cssVar(name, fallback = '') {
      if (typeof window === 'undefined') return fallback
      return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
    },
    sanitizePayload(payload) {
      if (!payload || typeof payload !== 'object') return null
      const owner = Number(payload?.meta?.owner_id || 0)
      if (this.ownerId && owner && owner !== this.ownerId) return null
      return this.withoutCompletedSavedSession(payload)
    },
    withoutCompletedSavedSession(payload) {
      const completedId = Number(this.postSessionCompletedSessionId || 0)
      if (completedId <= 0) return payload
      const matches = (entry) => Number(entry?.session_id || entry?.id || 0) === completedId
      if (!matches(payload?.continue) && !matches(payload?.journey?.continue)) return payload

      const next = { ...payload }
      if (matches(next.continue)) next.continue = null
      if (next.journey && matches(next.journey.continue)) {
        next.journey = { ...next.journey, continue: null }
      }
      return next
    },
    activityTitle(item) {
      if (!item) return ''
      const type = String(item.type || '').toLowerCase()
      const name = item.surah_name
        || (type.startsWith('session') ? this.t('dashboard.activity_type_session') : '')
        || (type === 'ai_check' || type === 'ai_recite' ? this.t('dashboard.activity_type_ai_check') : '')
        || (type === 'note' ? this.t('dashboard.activity_type_note') : '')
        || (type === 'assessment' ? this.t('dashboard.activity_type_assessment') : '')
        || (type === 'recommendation' ? this.t('dashboard.activity_type_recommendation') : '')
        || (type === 'ayah_memorised' ? this.t('dashboard.activity_type_memorised') : '')
      const range = this.formatItemRange(item)
      if (name && range) return `${name} · ${range}`
      if (name) return name
      if (range) return range
      return item.title || item.context || ''
    },
    activityOutcome(item) {
      if (!item) return ''
      const key = String(item.outcome_key || '').toLowerCase()
      const params = item.outcome_params && typeof item.outcome_params === 'object'
        ? item.outcome_params
        : {}

      if (key === 'session_completed') return this.t('dashboard.drawer_status_range_complete')
      if (key === 'session_ended_early') return this.t('dashboard.drawer_status_ended_early')
      if (key === 'session_saved') return this.t('dashboard.activity_outcome_saved')
      if (key === 'session_resumed') return this.t('dashboard.activity_outcome_resumed')
      if (key === 'ai_result') {
        const band = String(params.band || '').toLowerCase()
        let bandLabel = ''
        if (band === 'strong') bandLabel = this.t('dashboard.drawer_result_strong')
        else if (band === 'mixed') bandLabel = this.t('dashboard.drawer_result_mixed')
        else if (band === 'weak') bandLabel = this.t('dashboard.drawer_result_weak')
        const parts = []
        if (bandLabel) parts.push(bandLabel)
        if (params.accuracy != null && params.accuracy !== '') {
          parts.push(this.t('dashboard.drawer_accuracy', { n: Number(params.accuracy) }))
        }
        return parts.join(' · ') || this.t('dashboard.activity_type_ai_check')
      }
      if (key === 'ai_check') return this.t('dashboard.activity_type_ai_check')
      if (key === 'note_body') return String(params.body || item.outcome || '')
      if (key === 'note_saved') return this.t('dashboard.activity_note_saved')
      if (key === 'assessment_completed') return this.t('dashboard.activity_outcome_assessment')
      if (key === 'recommendation_ready') return this.t('dashboard.activity_outcome_recommendation')
      if (key === 'ayah_memorised') return this.t('dashboard.activity_outcome_memorised')
      return item.outcome || ''
    },
    activityTypeLabel(type) {
      const key = String(type || '').toLowerCase()
      if (key === 'session' || key.startsWith('session_')) return this.t('dashboard.activity_type_session')
      if (key === 'ai_check' || key === 'ai_recite') return this.t('dashboard.activity_type_ai_check')
      if (key === 'note') return this.t('dashboard.activity_type_note')
      if (key === 'assessment') return this.t('dashboard.activity_type_assessment')
      if (key === 'recommendation') return this.t('dashboard.activity_type_recommendation')
      if (key === 'ayah_memorised') return this.t('dashboard.activity_type_memorised')
      return ''
    },
    ayahRangeLabel(row) {
      if (!row) return ''
      const start = Number(row.ayah_start || row.current_ayah_start || 0)
      const end = Number(row.ayah_end || row.current_ayah_end || 0)
      if (start > 0 && end > 0 && start !== end) {
        return this.t('dashboard.ayah_range', { start, end })
      }
      if (start > 0) return this.t('dashboard.ayah_n', { n: start })
      if (end > 0) return this.t('dashboard.ayah_n', { n: end })
      return ''
    },
    formatItemRange(item) {
      return this.ayahRangeLabel({
        ayah_start: item?.ayah_start,
        ayah_end: item?.ayah_end,
      })
    },
    formatRelative(value) {
      if (!value) return ''
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return ''
      const minutes = Math.round((Date.now() - date.getTime()) / 60000)
      if (minutes < 1) return this.t('dashboard.just_now')
      if (minutes < 60) return this.t('dashboard.minutes_ago', { n: minutes })
      const hours = Math.round(minutes / 60)
      if (hours < 24) return this.t('dashboard.hours_ago', { n: hours })
      const days = Math.round(hours / 24)
      if (days === 1) return this.t('dashboard.yesterday')
      if (days < 8) return this.t('dashboard.days_ago', { n: days })
      return this.formatAbsoluteDate(date)
    },
    formatAbsoluteDate(value) {
      const date = value instanceof Date ? value : new Date(value)
      if (Number.isNaN(date.getTime())) return ''
      const locale = this.$i18n?.locale?.value || this.$i18n?.locale || undefined
      const sameYear = date.getFullYear() === new Date().getFullYear()
      return date.toLocaleDateString(locale, {
        day: 'numeric',
        month: 'short',
        ...(sameYear ? {} : { year: 'numeric' }),
      })
    },
    formatActivityDate(value) {
      if (!value) return ''
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return ''
      const days = Math.round((Date.now() - date.getTime()) / 86400000)
      if (days < 8) return this.formatRelative(value)
      return this.formatAbsoluteDate(date)
    },
    shortDate(value) {
      if (!value) return ''
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return String(value)
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
    },
    tooltipDate(value) {
      if (!value) return ''
      const date = new Date(`${value}T12:00:00`)
      if (Number.isNaN(date.getTime())) return this.shortDate(value)
      return date.toLocaleDateString([], { day: 'numeric', month: 'short' })
    },
    syncTheme() {
      if (typeof document === 'undefined') {
        this.darkTheme = false
        return
      }
      this.darkTheme = document.documentElement.getAttribute('data-theme') === 'dark'
    },
    murajaahStrengthRank(item) {
      const key = String(item?.strength || '').toLowerCase()
      if (key === 'fragile') return 0
      if (key === 'building') return 1
      if (key === 'strong') return 2
      return 3
    },
    sortMurajaahByUrgency(items) {
      const list = Array.isArray(items) ? [...items] : []
      return list.sort((a, b) => {
        const strengthDelta = this.murajaahStrengthRank(a) - this.murajaahStrengthRank(b)
        if (strengthDelta !== 0) return strengthDelta
        const historyRank = (item) => {
          const status = String(item?.history_status || '').toLowerCase()
          if (status === 'active') return 0
          if (status === 'improving') return 1
          if (status === 'resolved') return 2
          return 3
        }
        const statusDelta = historyRank(a) - historyRank(b)
        if (statusDelta !== 0) return statusDelta
        return Number(b?.history_attempts || 0) - Number(a?.history_attempts || 0)
      })
    },
    aiCheckTitle(item) {
      const name = String(item?.surah_name || '').trim()
      if (name) return name
      const surah = Number(item?.surah_number || 0)
      if (surah > 0) {
        return this.t('dashboard.surah_number_label', { n: surah }) || `Surah ${surah}`
      }
      return this.t('dashboard.ai_check_unknown_surah')
    },
    aiCheckRevisionHref(item) {
      const surah = Number(item?.surah_number || 0)
      const start = Number(item?.ayah_start || item?.ayah_end || 0)
      if (!(surah > 0 && start > 0)) return ''
      return this.reviewNowHref({
        surah_number: surah,
        ayah_number: start,
      })
    },
    reviewNowHref(item) {
      return buildReviewHref(this.memorisationUrl, {
        ...item,
        href: undefined,
        surah_number: item?.surah_number,
        ayah_number: item?.ayah_number || item?.ayah_start,
        ayah_end: item?.ayah_end || item?.ayah_number || item?.ayah_start,
      })
    },
    checkAgainHref(item) {
      return buildCheckAgainHref(this.memorisationUrl, item)
    },
    stashReviewContext(item) {
      stashPreviousAiCheck(typeof sessionStorage === 'undefined' ? null : sessionStorage, item)
    },
    referenceLine(item) {
      const stored = this.revisitAyahText[item?.key] || {}
      return paintReferenceWords(stored.text || '', item?.words || [], item?.ayah_number)
    },
    revisitStateLabel(item) {
      const state = String(item?.assessment_state || 'not_assessed')
      if (state === 'skipped') return this.t('dashboard.revisit_skipped')
      if (state === 'flagged') return this.t('dashboard.revisit_from_check')
      if (item?.evidence === 'due_revision') return this.t('dashboard.revisit_due')
      return this.t('dashboard.revisit_not_assessed')
    },
    presentationTone(score) {
      return presentationToneForScore(score)
    },
    formatPoints(value) {
      const n = Number(value)
      if (!Number.isFinite(n)) return ''
      const rounded = Math.round(n)
      return `${rounded > 0 ? '+' : ''}${rounded}`
    },
    onLearningMetric(metric) {
      if (metric?.action === 'hifz') this.openDrawer('hifz')
      if (metric?.action === 'revision') {
        this.historyFilter = 'revision'
        this.historyPage = 1
        this.$el?.querySelector('#dash-history-heading')?.scrollIntoView?.({ block: 'start' })
      }
      if (metric?.action === 'recitation') {
        this.historyFilter = 'recitation'
        this.historyPage = 1
        this.$el?.querySelector('#dash-history-heading')?.scrollIntoView?.({ block: 'start' })
      }
      if (metric?.action === 'ai') {
        this.$el?.querySelector('#ai-recite-results')?.scrollIntoView?.({ block: 'start' })
      }
    },
    historyEntryHref(item) {
      const surah = Number(item?.surah_number || 0)
      const from = Number(item?.ayah_start || item?.ayah_number || 0)
      const to = Number(item?.ayah_end || from || 0)
      const base = String(this.memorisationUrl || '/memorisation').split('?')[0]
      if (surah > 0 && from > 0) {
        const params = new URLSearchParams({
          surah: String(surah),
          from: String(from),
          to: String(Math.max(from, to)),
          return: 'dashboard',
        })
        const kind = String(item?.practice_kind || '')
        if (kind === 'revision') params.set('goal', 'revise')
        if (kind === 'recitation') params.set('ai_check', '1')
        return `${base}?${params.toString()}`
      }
      const raw = String(item?.href || '').trim()
      if (!raw) return ''
      try {
        const url = new URL(raw, 'http://localhost')
        if (!(Number(url.searchParams.get('surah') || 0) > 0)) return ''
        url.searchParams.set('return', 'dashboard')
        return `${url.pathname}${url.search}`
      } catch (_) {
        return ''
      }
    },
    historyKindLabel(item) {
      const kind = String(item?.practice_kind || '')
      if (kind === 'memorisation') return this.t('dashboard.history_filter_memorisation')
      if (kind === 'revision') return this.t('dashboard.history_filter_revision')
      if (kind === 'recitation') return this.t('dashboard.history_filter_recitation')
      if (kind === 'note') return this.t('dashboard.activity_type_note')
      return this.t('dashboard.history_unspecified')
    },
    historyKindIcon(item) {
      const kind = String(item?.practice_kind || '')
      if (kind === 'revision') return 'bi bi-arrow-repeat'
      if (kind === 'recitation') return 'bi bi-mic'
      if (kind === 'note') return 'bi bi-pencil'
      return 'bi bi-journal-bookmark'
    },
    historyTitle(item) {
      const surah = String(item?.surah_name || '').trim()
      const range = this.formatItemRange(item)
      if (surah && range) return `${surah} · ${range}`
      if (surah) return surah
      if (range && /^\d/.test(range)) return this.t('dashboard.history_ayahs', { range })
      if (range) return range
      return this.activityTitle(item)
    },
    historyActionHint(item) {
      if (!this.historyEntryHref(item)) return ''
      const kind = String(item?.practice_kind || '')
      if (kind === 'revision') return this.t('dashboard.history_open_revision')
      if (kind === 'recitation') return this.t('dashboard.history_open_recitation')
      if (kind === 'memorisation') return this.t('dashboard.history_open_memorisation')
      return this.t('dashboard.history_open_session')
    },
    formatHistoryClock(value) {
      if (!value) return ''
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return ''
      const locale = this.$i18n?.locale?.value || this.$i18n?.locale || undefined
      return date.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' })
    },
    focusReviewHref(item) {
      const surah = Number(item?.surah_number || 0)
      const ayah = Number(item?.ayah || item?.ayah_number || 0)
      if (!(surah > 0 && ayah > 0)) return ''
      return this.reviewNowHref({ surah_number: surah, ayah_number: ayah })
    },
    focusToneLabel(item) {
      const tone = String(item?.tone || this.aiAttemptTone(item) || '').toLowerCase()
      if (tone === 'weak') return this.t('dashboard.ai_band_weak')
      if (tone === 'mixed') return this.t('dashboard.ai_band_mixed')
      if (tone === 'strong') return this.t('dashboard.ai_band_strong')
      return ''
    },
    flaggedWordLabel(count) {
      const n = Number(count || 0)
      if (n === 1) return this.t('dashboard.ai_flagged_words_one')
      return this.t('dashboard.ai_flagged_words', { n })
    },
    revisitWhy(item) {
      const hint = this.murajaahItemHint(item)
      const generic = this.t('dashboard.murajaah_hint_default')
      if (hint && hint !== generic) return hint
      const state = String(item?.assessment_state || '')
      if (state === 'flagged') return this.t('dashboard.revisit_why_flagged')
      if (state === 'skipped') return this.t('dashboard.revisit_why_skipped')
      if (item?.evidence === 'due_revision') return this.t('dashboard.revisit_why_due')
      return this.t('dashboard.revisit_why_default')
    },
    async loadLearningHistory() {
      this.historyLoading = true
      this.historyError = false
      try {
        const items = await learningApi.getActivityLog(100)
        this.historyItems = Array.isArray(items) ? items : []
      } catch (error) {
        console.error('Learning history fetch failed', error)
        this.historyError = true
      } finally {
        this.historyLoading = false
      }
    },
    async hydrateRevisitAyahs() {
      const items = this.revisitItems
      await Promise.all(items.map(async (item) => {
        const key = item.key
        if (!key || this.revisitAyahText[key]?.text) return
        try {
          const ayah = await loadAyah(item.surah_number, item.ayah_number)
          this.revisitAyahText = {
            ...this.revisitAyahText,
            [key]: { text: ayah?.text || '', source: ayah?.text ? 'uthmani' : 'unavailable' },
          }
        } catch (_) {
          this.revisitAyahText = { ...this.revisitAyahText, [key]: { text: '', source: 'unavailable' } }
        }
      }))
    },
    attemptReviewItem(item) {
      const detail = this.expandedAttemptId === item?.id ? this.expandedComparison : null
      const words = []
      ;(detail?.ayahs || []).forEach((ayah) => {
        ;(ayah.stored || []).forEach((word) => {
          words.push({ ...word, ayah: ayah.number })
        })
      })
      return {
        ...item,
        ayah_number: item.ayah_start,
        words,
        attempt_id: item.id,
      }
    },
    aiCheckedLabel(item) {
      if (!item?.occurred_at) return ''
      const when = this.formatActivityDate(item.occurred_at)
      if (!when) return ''
      return this.t('dashboard.ai_recite.checked_at', { when })
    },
    async toggleAttemptDetail(item, force = false) {
      if (!force && this.expandedAttemptId === item.id) {
        this.expandedAttemptId = null
        this.expandedComparison = null
        return
      }
      this.expandedAttemptId = item.id
      this.expandedError = false

      const cached = !force ? this.expandedDetailCache[item.id] : null
      if (cached) {
        this.expandedComparison = cached
        this.expandedLoading = false
        return
      }

      this.expandedLoading = true
      this.expandedComparison = null
      try {
        const payload = await learningApi.getAiReciteAttemptAnalysis(item.id)
        const attempt = payload?.ai_attempt || {}
        const words = Array.isArray(attempt.word_statuses) ? attempt.word_statuses : []
        const built = await buildAttemptAyahFeedback({
          surahNumber: item.surah_number,
          ayahStart: item.ayah_start,
          ayahEnd: item.ayah_end,
          wordStatuses: words,
          loadAyahText: loadAyah,
          maxAyahs: 6,
        })
        const previous = (this.aiReciteView?.recent || []).find((other) => (
          other.id !== item.id
          && other.surah_number === item.surah_number
          && other.ayah_start === item.ayah_start
          && other.ayah_end === item.ayah_end
        ))
        const delta = compatibleAttemptDelta(item, previous)
        const counts = resolveWordCounts({
          ...item,
          word_counts: attempt.word_counts || item.word_counts,
          color_counts: attempt.color_counts || item.color_counts,
          has_word_alignment: words.length > 0,
        }) || resolveWordCounts(item)
        const insightKey = feedbackInsightKey(counts, { incomplete: built.incomplete })
        const detail = {
          ayahs: built.ayahs,
          incomplete: built.incomplete,
          counts,
          insightKey: `dashboard.ai_recite.${insightKey}`,
          delta,
          samePassageWithoutModel: !delta && !!previous,
          recurring: [],
        }
        this.expandedDetailCache = {
          ...this.expandedDetailCache,
          [item.id]: detail,
        }
        this.expandedComparison = detail
      } catch (error) {
        console.error('AI check detail failed', error)
        this.expandedError = true
      } finally {
        this.expandedLoading = false
      }
    },
    strengthLabel(item) {
      const key = String(item?.strength || '').toLowerCase()
      if (key === 'fragile') return this.t('dashboard.strength_fragile')
      if (key === 'building') return this.t('dashboard.strength_building')
      if (key === 'strong') return this.t('dashboard.strength_strong')
      return item?.strength_label || ''
    },
    weakHistoryStatusLabel(item) {
      const status = String(item?.history_status || '').toLowerCase()
      if (status === 'improving') return this.t('dashboard.weak_history_status_improving')
      if (status === 'resolved') return this.t('dashboard.weak_history_status_resolved')
      if (status === 'active') return this.t('dashboard.weak_history_status_active')
      return ''
    },
    murajaahItemHint(item) {
      if (!item) return ''
      const key = String(item.explanation_key || '').trim()
      if (key === 'weak_explain_phrase' && item.phrase) {
        return this.t('dashboard.murajaah_hint_phrase')
      }
      if (key === 'weak_explain_ai') return this.t('dashboard.murajaah_hint_ai')
      if (key === 'weak_explain_plan') return this.t('dashboard.murajaah_hint_plan')
      if (key === 'weak_explain_history') return this.t('dashboard.murajaah_hint_history')
      const strength = String(item.strength || '').toLowerCase()
      if (strength === 'fragile') return this.t('dashboard.murajaah_hint_fragile')
      if (strength === 'building') return this.t('dashboard.murajaah_hint_building')
      if (strength === 'strong') return this.t('dashboard.murajaah_hint_strong')
      return this.t('dashboard.murajaah_hint_default')
    },
    weakHistoryLine(item) {
      if (!item) return ''
      const attempts = Number(item.history_attempts || 0)
      const parts = []
      if (attempts === 1) {
        parts.push(this.t('dashboard.weak_history_attempts_one', { n: 1 }))
      } else if (attempts > 1) {
        parts.push(this.t('dashboard.weak_history_attempts', { n: attempts }))
      }
      const status = this.weakHistoryStatusLabel(item)
      if (status && String(item.history_status || '') !== 'active') {
        parts.push(status)
      }
      const when = this.formatActivityDate(item.last_identified_at || item.detected_at)
      if (when && attempts > 0) {
        parts.push(this.t('dashboard.weak_history_last', { when }))
      }
      return parts.filter(Boolean).join(' · ')
    },
    completionBar(label, value) {
      const display = progressBarDisplay(value)
      return {
        label,
        value: display.percent,
        fillWidth: display.fillWidth,
        hasProgress: display.hasProgress,
      }
    },
    sessionStatusLabel(status) {
      if (status === 'ended_early') return this.t('dashboard.drawer_status_ended_early')
      if (status === 'completed') return this.t('dashboard.drawer_status_range_complete')
      return this.t('dashboard.drawer_status_completed')
    },
    aiBandLabel(band) {
      const key = String(band || '').toLowerCase()
      if (key === 'strong') return this.t('dashboard.drawer_result_strong')
      if (key === 'mixed') return this.t('dashboard.drawer_result_mixed')
      if (key === 'weak') return this.t('dashboard.drawer_result_weak')
      return key ? key.charAt(0).toUpperCase() + key.slice(1) : ''
    },
    async loadAiReciteResults() {
      const requestId = ++this.aiReciteRequestId
      this.aiReciteLoading = true
      this.aiReciteError = false
      try {
        const stats = await learningApi.getDashboardAiReciteStats()
        if (requestId !== this.aiReciteRequestId) return
        this.aiReciteStats = await this.hydrateAiRecitePreviewGlyphs(stats)
        if (requestId !== this.aiReciteRequestId) return
        this.scrollToAiReciteResults()
      } catch (error) {
        console.error('AI Recite results fetch failed', error)
        if (requestId !== this.aiReciteRequestId) return
        this.aiReciteError = true
      } finally {
        if (requestId === this.aiReciteRequestId) this.aiReciteLoading = false
      }
    },
    async hydrateAiRecitePreviewGlyphs(stats) {
      // Dashboard previews must stay on shaped Unicode Arabic — never QCF page
      // glyphs. Presentation-form fonts break joining in list rows.
      if (!stats || !Array.isArray(stats.recent_attempts)) return stats
      const recentAttempts = stats.recent_attempts.map((item) => {
        const weakWords = Array.isArray(item?.weak_words) ? item.weak_words : []
        const ayah = Number(
          weakWords[0]?.ayahNumber
          ?? weakWords[0]?.ayah_number
          ?? item?.ayah_start
          ?? 0,
        )
        const parts = weakWords
          .filter((word) => Number(word?.ayahNumber ?? word?.ayah_number ?? ayah) === ayah)
          .map((word) => {
            const text = String(word?.text || word?.word || word?.target_word || '').trim()
            return text
              ? {
                text,
                plainText: text,
                tone: 'incorrect',
                weak: true,
                madaniGlyph: false,
                fontFamily: '',
              }
              : null
          })
          .filter(Boolean)
          .slice(0, 4)
        return { ...item, madani_preview: parts }
      })
      return { ...stats, recent_attempts: recentAttempts }
    },
    madaniPartStyle() {
      return {
        fontFamily: 'var(--dash-font-ar, "Noto Naskh Arabic", "Amiri", "Geeza Pro", serif)',
        letterSpacing: '0',
      }
    },
    scrollToAiReciteResults() {
      if (typeof window === 'undefined' || window.location.hash !== '#ai-recite-results') return
      this.$nextTick(() => {
        const el = this.$refs.aiReciteResults
        if (!el || typeof el.scrollIntoView !== 'function') return
        el.scrollIntoView({
          behavior: this.reduceMotion ? 'auto' : 'smooth',
          block: 'start',
        })
      })
    },
    aiAttemptAccuracy(item) {
      const accuracy = Number(item?.accuracy_percent)
      if (!Number.isFinite(accuracy) || accuracy < 0) return '—'
      return this.t('dashboard.drawer_accuracy', { n: accuracy })
    },
    aiAttemptScoreShort(item) {
      const accuracy = Number(item?.accuracy_percent)
      if (!Number.isFinite(accuracy) || accuracy < 0) return '—'
      return `${Math.round(accuracy)}%`
    },
    aiAttemptTone(item) {
      const band = String(item?.band || '').toLowerCase()
      if (['strong', 'mixed', 'weak'].includes(band)) return band
      const accuracy = Number(item?.accuracy_percent)
      if (!Number.isFinite(accuracy)) return 'neutral'
      return recitationAccuracyBand(accuracy)
    },
    aiAttemptActionLabel(item) {
      const parts = [
        this.aiCheckTitle(item),
        this.ayahRangeLabel(item),
        this.aiAttemptAccuracy(item),
        this.formatActivityDate(item.occurred_at),
        this.t('dashboard.ai_recite.results_open'),
      ].filter(Boolean)
      return parts.join(', ')
    },
    aiResultLabel(item) {
      const band = String(item?.band || '').toLowerCase()
      let bandLabel = ''
      if (band === 'strong') bandLabel = this.t('dashboard.drawer_result_strong')
      else if (band === 'mixed') bandLabel = this.t('dashboard.drawer_result_mixed')
      else if (band === 'weak') bandLabel = this.t('dashboard.drawer_result_weak')
      else bandLabel = band ? band.charAt(0).toUpperCase() + band.slice(1) : ''

      const accuracy = Number(item?.accuracy_percent)
      if (Number.isFinite(accuracy) && accuracy >= 0) {
        const pct = this.t('dashboard.drawer_accuracy', { n: accuracy })
        return bandLabel ? `${bandLabel} · ${pct}` : pct
      }
      return bandLabel || '—'
    },
    noteHeading(item) {
      const surah = Number(item?.surah_number || 0)
      const ayah = Number(item?.ayah_number || 0)
      const ref = surah > 0 && ayah > 0 ? `${surah}:${ayah}` : ''
      const title = String(item?.title || '').trim()
      if (title && ref) return `${ref} · ${title}`
      if (title) return title
      return ref || this.t('dashboard.metric_notes')
    },
    noteSnippet(item) {
      const body = String(item?.body || '').replace(/\s+/g, ' ').trim()
      if (!body) return ''
      return body.length > 96 ? `${body.slice(0, 96)}…` : body
    },
    onMetricActivate(event, metric) {
      if (metric?.href) return
      event?.preventDefault?.()
      if (metric?.drawer) this.openDrawer(metric.drawer)
    },
    onAnalyticActivate(item) {
      if (!item?.drawer) return
      this.openDrawer(item.drawer)
      if (item.filter) {
        this.activityFilter = item.filter
      }
    },
    async openDrawer(mode) {
      if (!mode || mode === 'notes') return
      if (!this.drawerOpen) this.drawerReturnFocus = captureReturnFocus()
      this.drawerMode = mode
      this.drawerItems = []
      this.drawerError = false
      this.activityFilter = 'all'
      this.drawerAiSearch = ''
      this.drawerAiBandFilter = 'all'
      this.syncDrawerBodyLock(true)
      this.$nextTick(() => {
        this.$refs.drawerClose?.focus?.({ preventScroll: true })
      })

      if (mode === 'murajaah') {
        this.drawerItems = this.dailyWeakAllItems
        this.drawerLoading = false
        this.drawerError = false
        return
      }

      if (mode === 'due') {
        this.drawerItems = this.dailyDueAllItems
        this.drawerLoading = false
        this.drawerError = false
        return
      }

      this.drawerLoading = true
      const requestId = ++this.drawerRequestId
      try {
        let items = []
        if (mode === 'achievements') {
          const payload = await learningApi.getAchievements()
          if (requestId !== this.drawerRequestId) return
          this.achievementDrawerItems = Array.isArray(payload?.items) ? payload.items : []
          this.achievementDrawerTiers = Array.isArray(payload?.tiers) ? payload.tiers : []
          this.enqueueAchievementUnlocks(payload?.pending_unlocks)
          trackProductEvent(PRODUCT_EVENTS.ACHIEVEMENT_VIEWED, {
            unlock_source: 'dashboard_drawer',
          }, { onceKey: 'achievement_viewed:drawer' })
          trackProductEvent(PRODUCT_EVENTS.ACHIEVEMENT_PROGRESS_VIEWED, {
            unlock_source: 'dashboard_drawer',
          }, { onceKey: 'achievement_progress_viewed:drawer' })
          this.drawerItems = this.achievementDrawerItems
        } else if (mode === 'activity') {
          items = await learningApi.getActivityLog()
        } else if (mode === 'sessions') {
          items = await learningApi.getSessionHistory()
        } else if (mode === 'ai_checks') {
          items = await learningApi.getAiReciteAttempts()
        } else if (mode === 'hifz') {
          const progress = await learningApi.getProgress({ limit: 1000 })
          items = this.groupHifzProgress(progress)
        }
        if (requestId !== this.drawerRequestId) return
        if (mode !== 'achievements') {
          this.drawerItems = Array.isArray(items) ? items : []
        }
      } catch (error) {
        console.error('Dashboard drawer fetch failed', error)
        if (requestId !== this.drawerRequestId) return
        this.drawerError = true
        this.drawerItems = []
      } finally {
        if (requestId === this.drawerRequestId) this.drawerLoading = false
      }
    },
    closeDrawer({ restoreFocus = true } = {}) {
      this.drawerRequestId += 1
      const returnFocus = this.drawerReturnFocus
      this.drawerReturnFocus = null
      this.drawerMode = null
      this.drawerItems = []
      this.drawerLoading = false
      this.drawerError = false
      this.activityFilter = 'all'
      this.drawerAiSearch = ''
      this.drawerAiBandFilter = 'all'
      this.syncDrawerBodyLock(false)
      if (restoreFocus) {
        this.$nextTick(() => restoreReturnFocus(returnFocus))
      }
    },
    onDrawerKeydown(event) {
      handleModalKeydown(event, {
        container: this.$refs.drawer,
        onEscape: () => this.closeDrawer(),
        open: this.drawerOpen,
      })
    },
    retryDrawer() {
      if (!this.drawerMode) return
      this.openDrawer(this.drawerMode)
    },
    analysisTargetForItem(item, fallbackKind = '') {
      const kind = String(item?.analysis_kind || fallbackKind || '').toLowerCase()
      const sourceId = Number(item?.source_id || 0)
      const rowId = Number(item?.id || 0)
      if (kind === 'attempt') {
        return { kind: 'attempt', id: sourceId > 0 ? sourceId : rowId }
      }
      if (kind === 'session') {
        return { kind: 'session', id: sourceId > 0 ? sourceId : rowId }
      }
      const type = String(item?.type || '').toLowerCase()
      if (type === 'ai_check' || type === 'ai_recite') {
        return { kind: 'attempt', id: sourceId > 0 ? sourceId : rowId }
      }
      if (type === 'session' || type.startsWith('session_')) {
        return { kind: 'session', id: sourceId > 0 ? sourceId : rowId }
      }
      if (fallbackKind === 'attempt' || fallbackKind === 'session') {
        return { kind: fallbackKind, id: sourceId > 0 ? sourceId : rowId }
      }
      return null
    },
    canViewAnalysis(item, fallbackKind = '') {
      const target = this.analysisTargetForItem(item, fallbackKind)
      if (!target?.id) return false
      if (target.kind === 'attempt') return item?.has_analysis !== false
      return item?.has_analysis === true
    },
    analysisItemKey(item, fallbackKind = '') {
      const target = this.analysisTargetForItem(item, fallbackKind)
      if (!target?.id) return ''
      return `${target.kind}:${target.id}`
    },
    isAnalysisLoading(item, fallbackKind = '') {
      return this.analysisLoading && this.analysisSourceKey === this.analysisItemKey(item, fallbackKind)
    },
    openAnalysisForItem(item, fallbackKind = '') {
      const target = this.analysisTargetForItem(item, fallbackKind)
      if (!target?.id) return
      this.openSessionAnalysis(target.kind, { id: target.id })
    },
    sessionAnalysisKey(item) {
      return this.analysisItemKey(item, 'session')
    },
    attemptAnalysisKey(item) {
      return this.analysisItemKey(item, 'attempt')
    },
    openSessionAnalysis(kind, item) {
      const id = Number(item?.id || item?.source_id || 0)
      if (id <= 0) return
      this.analysisSourceKind = kind === 'attempt' ? 'attempt' : 'session'
      this.analysisSourceId = id
      this.analysisSourceKey = this.analysisSourceKind === 'attempt'
        ? this.attemptAnalysisKey(item)
        : this.sessionAnalysisKey(item)
      this.analysisView = null
      if (this.drawerOpen) this.closeDrawer({ restoreFocus: false })
      this.analysisError = false
      this.analysisLoading = true
      this.analysisModalOpen = true
      this.fetchSessionAnalysis()
    },
    openAdvancedAnalytics() {
      if (!this.canUseAdvancedAnalytics) return
      this.advancedAnalyticsOpen = true
    },
    closeAdvancedAnalytics() {
      this.advancedAnalyticsOpen = false
    },
    closeSessionAnalysis() {
      this.analysisRequestId += 1
      this.analysisModalOpen = false
      this.analysisLoading = false
      this.analysisError = false
      this.analysisView = null
      this.analysisSourceKind = null
      this.analysisSourceId = null
      this.analysisSourceKey = ''
    },
    retrySessionAnalysis() {
      if (!this.analysisSourceId || !this.analysisSourceKind) return
      this.analysisError = false
      this.analysisView = null
      this.analysisLoading = true
      this.fetchSessionAnalysis()
    },
    async fetchSessionAnalysis() {
      const kind = this.analysisSourceKind
      const id = Number(this.analysisSourceId || 0)
      if (!kind || id <= 0) return
      const requestId = ++this.analysisRequestId
      this.analysisLoading = true
      this.analysisError = false
      this.analysisView = null
      try {
        const payload = kind === 'attempt'
          ? await learningApi.getAiReciteAttemptAnalysis(id)
          : await learningApi.getSessionAnalysis(id)
        if (requestId !== this.analysisRequestId) return
        if (kind === 'attempt') {
          const session = payload?.session || {}
          const view = buildWorkspaceAiReciteResultView({
            submitData: payload,
            assessment: payload?.assessment,
            aiAttempt: payload?.ai_attempt,
            audioUrl: payload?.audio?.url || '',
            surahNumber: Number(session.surah_number || payload?.assessment?.surah_number || 0),
            surahName: session.surah_name || payload?.assessment?.surah_name || '',
            rangeStart: Number(session.ayah_start || payload?.assessment?.start_ayah || 0),
            rangeEnd: Number(session.ayah_end || payload?.assessment?.end_ayah || 0),
          }, this.t.bind(this))
          this.analysisView = view
        } else {
          this.analysisView = buildSessionAnalysisView(payload, this.t.bind(this), { includeRecommendations: false })
        }
        this.analysisError = false
      } catch (error) {
        console.error('Session analysis fetch failed', error)
        if (requestId !== this.analysisRequestId) return
        this.analysisError = true
        this.analysisView = null
      } finally {
        if (requestId === this.analysisRequestId) this.analysisLoading = false
      }
    },
    async hydrateSavedReciteMadaniGlyphs(view) {
      // Keep Unicode Arabic for feedback — QCF page glyphs break outside mushaf.
      return view
    },
    retrySavedReciteAttempt() {
      const view = this.analysisView || {}
      const surah = Number(view.surahNumber || 0)
      const from = Number(view.rangeStart || 0)
      const to = Math.max(from, Number(view.rangeEnd || from))
      if (!(surah > 0 && from > 0)) return
      const base = this.memorisationUrl.split('?')[0]
      const params = new URLSearchParams({
        surah: String(surah),
        from: String(from),
        to: String(to),
        ai_check: '1',
        return: 'dashboard',
      })
      window.location.assign(`${base}?${params.toString()}`)
    },
    syncDrawerBodyLock(open) {
      if (typeof document === 'undefined') return
      document.documentElement.classList.toggle('dash-drawer-open', open)
      document.body.classList.toggle('dash-drawer-open', open)
    },
    groupHifzProgress(rows) {
      const list = Array.isArray(rows) ? rows : []
      const groups = new Map()
      list.forEach((row) => {
        const surah = Number(row?.surah_number || 0)
        const ayah = Number(row?.ayah_number || 0)
        if (surah <= 0 || ayah <= 0) return
        const status = String(row?.status || '').toLowerCase()
        if (!groups.has(surah)) {
          groups.set(surah, {
            surah_number: surah,
            surah_name: row?.surah_name || `Surah ${surah}`,
            memorised_count: 0,
            learning_count: 0,
            memorised_ayahs: [],
          })
        }
        const group = groups.get(surah)
        if (status === 'memorised' || status === 'mastered') {
          group.memorised_count += 1
          group.memorised_ayahs.push(ayah)
        } else if (status === 'learning' || status === 'reviewing') {
          group.learning_count += 1
        }
      })

      return Array.from(groups.values())
        .map((group) => ({
          ...group,
          memorised_ayahs: group.memorised_ayahs.sort((a, b) => a - b),
        }))
        .sort((a, b) => a.surah_number - b.surah_number)
    },
    reload(force = false) {
      this.fetchDashboard(this.chartDays, { force, announce: force })
      this.loadAiReciteResults()
      this.loadLearnerSupport()
    },
    async retryPendingPostSessionWrites() {
      const sessionRetry = readSessionCompletionRetry()
      const assessmentRetry = readAiAssessmentRetry()
      const tasks = []

      if (sessionRetry?.payload) {
        tasks.push(
          learningApi.endSession(sessionRetry.payload)
            .then(() => clearSessionCompletionRetry())
            .catch(() => null),
        )
      }
      if (assessmentRetry?.payload) {
        tasks.push(
          learningApi.createMemorisationAssessment(assessmentRetry.payload)
            .then(() => clearAiAssessmentRetry())
            .catch(() => null),
        )
      }

      if (tasks.length) await Promise.allSettled(tasks)
    },
    async loadLearnerSupport() {
      if (this.auth?.learner_teacher_section_enabled !== true) return
      this.supportLoading = true
      try {
        this.support = await learningApi.getLearnerSupport()
        this.supportError = ''
      } catch (error) {
        this.support = this.support || { assignments: [], feedback: [] }
        this.supportError = error?.response?.data?.message || this.t('teacher.learner_assignments_load_failed')
      } finally {
        this.supportLoading = false
      }
    },
    async startSupportAssignment(item) {
      if (this.auth?.learner_teacher_section_enabled !== true) return
      this.supportError = ''
      this.assignmentSavingId = Number(item?.id || 0)
      try {
        const payload = await learningApi.startLearnerAssignment(item.id)
        if (payload?.recipient && Array.isArray(this.support?.assignments)) {
          const next = this.support.assignments.map((row) => (
            row.id === payload.recipient.id ? { ...row, ...payload.recipient } : row
          ))
          this.support = { ...this.support, assignments: next }
        }
        if (payload?.href) {
          window.location.assign(payload.href)
          return
        }
        this.showToast(this.t('teacher.action_failed'))
      } catch (error) {
        this.supportError = error?.response?.data?.message || this.t('teacher.action_failed')
        this.showToast(this.supportError)
      } finally {
        this.assignmentSavingId = 0
      }
    },
    async completeSupportAssignment(item) {
      if (this.auth?.learner_teacher_section_enabled !== true) return
      this.supportError = ''
      this.assignmentCompletionMessage = ''
      this.assignmentFailedItem = null
      this.assignmentSavingId = Number(item?.id || 0)
      try {
        this.support = await learningApi.completeLearnerAssignment(item.id)
        this.assignmentCompletionMessage = this.t('teacher.learner_assignments_submitted_success')
        clearTimeout(this.assignmentCompletionTimer)
        this.assignmentCompletionTimer = setTimeout(() => this.dismissAssignmentCompletion(), 5000)
      } catch (error) {
        this.supportError = error?.response?.data?.message || this.t('teacher.action_failed')
        this.assignmentFailedItem = item
      } finally {
        this.assignmentSavingId = 0
      }
    },
    async sendSupportNote(item, body, recording = null) {
      if (this.auth?.learner_teacher_section_enabled !== true) return null
      const payload = await learningApi.sendLearnerAssignmentMessage(item.id, body, recording)
      const message = payload?.message || null
      if (message && item?.id) {
        this.support = applyAssignmentThreadUpdate(this.support, {
          taskId: item.id,
          append: message,
          threadUnreadCount: 0,
        })
      }
      return message
    },
    patchLearnerSupportThread(payload) {
      this.support = applyAssignmentThreadUpdate(this.support, payload)
    },
    async sendDirectTeacherMessage(teacherId, body) {
      if (this.auth?.learner_teacher_section_enabled !== true) return null
      const payload = await learningApi.sendLearnerTeacherMessage(teacherId, body)
      return payload?.message || null
    },
    showCompletedAssignments() {
      this.assignmentCompletionMessage = ''
      this.$nextTick(() => {
        this.$el?.querySelector('.learner-teacher__filter.is-done')?.click()
      })
    },
    dismissAssignmentCompletion() {
      clearTimeout(this.assignmentCompletionTimer)
      this.assignmentCompletionTimer = null
      this.assignmentCompletionMessage = ''
    },
    setChartDays(days) {
      const next = days === 7 ? 7 : 30
      if (next === this.chartDays && this.data?.chart?.days === next && !this.loading) return
      this.chartDays = next
      this.chartReady = false
      this.fetchDashboard(next)
    },
    async fetchDashboard(days = this.chartDays, options = {}) {
      const { quiet = false, initial = false, force = false, announce = false } = options
      const safeDays = days === 7 ? 7 : 30
      if (
        quiet
        && !force
        && this.data
        && this.lastDashboardFetchedAt
        && (Date.now() - this.lastDashboardFetchedAt) < this.dashboardQuietTtlMs
      ) {
        return
      }
      const requestId = ++this.dashboardRequestId
      try { this._dashboardAbort?.abort?.() } catch (_) { /* ignore */ }
      this._dashboardAbort = typeof AbortController !== 'undefined'
        ? new AbortController()
        : null
      if (!quiet) {
        this.loading = true
        this.syncState = 'loading'
      }
      try {
        const payload = await learningApi.getDashboard(safeDays, {
          signal: this._dashboardAbort?.signal,
          fresh: force,
        })
        if (requestId !== this.dashboardRequestId) return
        const sanitized = this.sanitizePayload(payload)
        if (!sanitized) throw new Error('Dashboard payload owner mismatch')
        const chartFingerprint = JSON.stringify({
          days: sanitized?.chart?.days,
          points: sanitized?.chart?.points,
          summary: sanitized?.chart?.summary,
        })
        const chartChanged = chartFingerprint !== this.lastChartFingerprint
        this.data = sanitized
        if (sanitized?.ai_recite_stats && !this.aiReciteStats) {
          this.aiReciteStats = sanitized.ai_recite_stats
        }
        this.hydrateRevisitAyahs()
        this.error = false
        this.failureKind = 'failure'
        this.lastSyncedAt = sanitized?.meta?.generated_at || new Date().toISOString()
        this.lastDashboardFetchedAt = Date.now()
        this.syncState = 'ready'
        if (sanitized?.chart?.days === 7 || sanitized?.chart?.days === 30) {
          this.chartDays = sanitized.chart.days
        } else {
          this.chartDays = safeDays
        }
        // Remount Chart.js only when the series actually changed.
        if (chartChanged || !quiet) {
          this.lastChartFingerprint = chartFingerprint
          this.chartReady = false
          await this.$nextTick()
        }
        if (requestId === this.dashboardRequestId) {
          this.chartReady = true
          this.refreshActiveSessionSnapshot()
          this.scrollToAiReciteResults()
          this.enqueueAchievementUnlocks(sanitized?.achievements?.pending_unlocks)
          if (announce) this.showToast(this.t('dashboard.updated'))
        }
      } catch (error) {
        if (
          error?.code === 'ERR_CANCELED'
          || error?.name === 'CanceledError'
          || error?.name === 'AbortError'
        ) {
          return
        }
        console.error('Dashboard fetch failed', error)
        if (requestId !== this.dashboardRequestId) return
        if (initial || !this.data) {
          this.failureKind = classifyRequestFailure(error)
          this.error = true
          this.data = null
        }
        this.syncState = 'error'
        if (announce) this.showToast(this.t('dashboard.load_error'))
        this.chartReady = true
      } finally {
        if (requestId === this.dashboardRequestId) {
          this.loading = false
        }
      }
    },
    showToast(message) {
      const text = String(message || '').trim()
      if (!text) return
      if (this.toastTimer) clearTimeout(this.toastTimer)
      this.toastMessage = text
      this.toastTimer = setTimeout(() => this.clearToast(), 3500)
    },
    clearToast() {
      if (this.toastTimer) clearTimeout(this.toastTimer)
      this.toastTimer = null
      this.toastMessage = ''
    },
    achievementName(item) {
      const id = item?.id || item
      return this.t(`dashboard.achievements.items.${id}.name`)
    },
    achievementDescription(item) {
      const id = item?.id || item
      return this.t(`dashboard.achievements.items.${id}.description`)
    },
    achievementMeaning(item) {
      if (!item?.id) return ''
      if (item.state === 'unlocked') {
        return this.t(`dashboard.achievements.items.${item.id}.unlock`)
      }
      const key = `dashboard.achievements.items.${item.id}.meaning`
      const value = this.t(key)
      return value === key ? this.achievementDescription(item) : value
    },
    achievementHowLabel(item) {
      if (!item?.id) return ''
      const key = `dashboard.achievements.items.${item.id}.how`
      const value = this.t(key)
      return value === key ? '' : value
    },
    achievementUnlockMessage(item) {
      const id = item?.id || item
      return this.t(`dashboard.achievements.items.${id}.unlock`)
    },
    achievementStatusLabel(item) {
      if (!item) return ''
      if (item.is_next && item.state !== 'unlocked') return this.t('dashboard.achievements.status_next')
      if (item.state === 'unlocked') return this.t('dashboard.achievements.status_unlocked')
      if (item.state === 'in_progress') return this.t('dashboard.achievements.status_in_progress')
      return this.t('dashboard.achievements.status_locked')
    },
    achievementSectionSubtitle(widget) {
      if (!widget) return this.t('dashboard.achievements.subtitle')
      if (widget.next?.id) {
        return this.t('dashboard.achievements.subtitle_next', {
          name: this.achievementName(widget.next),
        })
      }
      const unlocked = Number(widget.unlocked_count || 0)
      const total = Number(widget.total_count || 0)
      if (unlocked > 0) {
        return this.t('dashboard.achievements.subtitle_done', { unlocked, total })
      }
      return this.t('dashboard.achievements.subtitle')
    },
    achievementTierTitle(tier) {
      const id = tier?.id || 'beginner'
      return this.t(`dashboard.achievements.tiers.${id}.name`)
    },
    achievementTierHint(tier) {
      const id = tier?.id || 'beginner'
      if (tier?.complete) {
        return this.t(`dashboard.achievements.tiers.${id}.complete_hint`)
      }
      return this.t(`dashboard.achievements.tiers.${id}.hint`)
    },
    achievementProgressLabel(item) {
      if (!item || item.state === 'unlocked') return ''
      if ((item.target || 0) <= 0) return ''
      const current = item.current || 0
      const target = item.target || 0
      const unit = item.unit || this.achievementUnitFor(item.id)
      const keyMap = {
        session: 'progress_session',
        streak: 'progress_streak',
        day: 'progress_day',
        surah: 'progress_surah',
        revision: 'progress_revision',
        check: 'progress_check',
        improvement: 'progress_improvement',
        week: 'progress_week',
      }
      const key = keyMap[unit] || 'progress_generic'
      return this.t(`dashboard.achievements.${key}`, { current, target })
    },
    achievementUnitFor(id) {
      const map = {
        first_steps: 'session',
        checker: 'check',
        consistent: 'streak',
        memoriser: 'session',
        explorer: 'surah',
        dedicated: 'day',
        reviser: 'revision',
        growing: 'improvement',
        focused: 'week',
        steadfast: 'day',
      }
      return map[id] || 'session'
    },
    achievementRemainingLabel(item) {
      if (!item || item.state === 'unlocked') return ''
      if (item.id === 'focused' && item.detail === 'goal_unset') {
        return this.t('dashboard.achievements.focused_set_goal')
      }
      const remaining = Math.max(0, (item.target || 0) - (item.current || 0))
      if (remaining <= 0) return ''
      const unit = item.unit || this.achievementUnitFor(item.id)
      if (unit === 'surah') return this.t('dashboard.achievements.remaining_surahs', { n: remaining })
      if (unit === 'check') return this.t('dashboard.achievements.remaining_attempts', { n: remaining })
      if (unit === 'improvement') {
        if (item.detail === 'insufficient_data') {
          return this.t('dashboard.achievements.remaining_attempts', { n: remaining })
        }
        return this.t('dashboard.achievements.remaining_improvement')
      }
      if (unit === 'streak' || unit === 'day' || unit === 'week') {
        return this.t('dashboard.achievements.remaining_days', { n: remaining })
      }
      return this.t('dashboard.achievements.remaining_sessions', { n: remaining })
    },
    achievementRequirement(item) {
      if (!item || item.state === 'unlocked' || item.state === 'in_progress') return ''
      if (item.id === 'focused' && (item.detail === 'goal_unset' || !(item.target > 0))) {
        return this.t('dashboard.achievements.focused_set_goal')
      }
      return this.achievementHowLabel(item) || this.t(`dashboard.achievements.items.${item.id}.requirement`)
    },
    isAchievementsDesktopLayout() {
      if (typeof window === 'undefined' || !window.matchMedia) return false
      return window.matchMedia('(min-width: 900px)').matches
    },
    revealAchievementsSection() {
      if (this.isSectionCollapsed('achievements')) {
        this.toggleSection('achievements')
      }
      this.$nextTick(() => {
        const el = document.getElementById('achievements')
        if (el && typeof el.scrollIntoView === 'function') {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      })
    },
    openAchievementsFromHash() {
      if (typeof window === 'undefined') return
      if (window.location.hash !== '#achievements') return
      this.$nextTick(() => {
        void this.openAchievementsDrawer()
      })
    },
    enqueueAchievementUnlocks(pending) {
      const list = Array.isArray(pending) ? pending : []
      if (!list.length) return
      const existing = new Set(this.achievementUnlockQueue.map((item) => item.id))
      list.forEach((item) => {
        if (!item?.id || existing.has(item.id) || this.achievementNotifiedIds[item.id]) return
        this.achievementUnlockQueue.push(item)
        existing.add(item.id)
      })
    },
    async acknowledgeAchievementUnlock(achievementId) {
      if (!achievementId) return
      this.achievementNotifiedIds = { ...this.achievementNotifiedIds, [achievementId]: true }
      this.achievementUnlockQueue = this.achievementUnlockQueue.filter((item) => item.id !== achievementId)
      try {
        await learningApi.acknowledgeAchievements([achievementId])
      } catch (error) {
        console.error('Achievement acknowledge failed', error)
      }
    },
    async openAchievementsDrawer() {
      if (this.isAchievementsDesktopLayout()) {
        this.revealAchievementsSection()
        return
      }
      await this.openDrawer('achievements')
    },
  },
}
</script>
