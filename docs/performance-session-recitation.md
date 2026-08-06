# Session & AI-recitation performance notes

Targeted optimisations for Mutqin session start, AI recitation, recommendations, dashboard, and the tools toolbar. Behaviour and visuals are unchanged.

## Bottlenecks found

1. **Unfinished session lookup** loaded every `user_sessions` row for the user, then scanned in PHP (dashboard + session APIs).
2. **Post-session recommendation** awaited a full `mutqinState` deep-clone sync before the plan could appear, even when session end already returned a recommendation.
3. **Dashboard** quiet-refetched on mount whenever `initialData` existed, and again on both `visibilitychange` and `focus`, remounting Chart.js every time.
4. **Deep `mutqinState` watch** stringify/clone ran on every nested live-session mutation and scheduled backend sync during AMD listening / session start.
5. **Tools offcanvas** stayed fully mounted while closed (large setup/techniques/saved tree).
6. **Live AMD paint** did linear ayah-bound lookups per patched word; VAD ran full FFT work every animation frame; audio `currentTime` dirtied the Memorisation root ~8 Hz.
7. **AI Recite progress rollup** issued one `firstOrNew` SELECT per ayah; activity chart loaded all completed sessions into memory to group by day.
8. **Missing index** on `(user_id, ended_at)` for chart/history range queries.

## Improvements made

| Area | Change |
|---|---|
| Session lifecycle | `currentUnfinished` / legacy lock path query unfinished statuses first and cap legacy scans |
| Recommendations | Background (non-blocking) learning sync; abort stale `/recommendations/next` when modal state resets; keep end-response plan when already ready |
| Session start | Backend `startSession` no longer awaited before local countdown/playback |
| Dashboard | Skip mount quiet refetch when `initialData` present; 45s quiet TTL; abort superseded fetches; remount chart only when series fingerprint changes |
| Persistence | Debounce deep-state save (400ms); skip learning sync while STARTING or AMD recording |
| Toolbar | Lazy-mount tools panel on first open (`v-if` + keep warm) |
| AMD / audio | O(1) ayah-bound map; VAD ~15 Hz; audio UI sync ~4 Hz; follow scroll only when confirmed cursor moves; skip tajweed child scans when no marks |
| Backend data | SQL `GROUP BY DATE(ended_at)` for chart; bulk-load progress rows before AI Recite rollup; add `(user_id, ended_at)` index |
| API client | Do not retry aborted Axios requests |

## Intentionally not done

- No aggressive caching of recitation results or recommendation payloads that could show stale accuracy/plans.
- Full split of the Memorisation Options-API monolith into child components (higher risk; deferred).
- Incremental ASR alignment windowing (larger behavioural risk; signature skip + DOM patching already mitigate the worst freezes).
