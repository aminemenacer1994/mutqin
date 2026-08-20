<?php

namespace App\Services;

use App\Enums\RecommendationType;
use App\Enums\UserSessionStatus;
use App\Models\MemorisationProgress;
use App\Models\SessionRecommendation;
use App\Models\User;
use App\Models\UserLastPosition;
use App\Models\UserSession;
use App\Support\QuranMetadata;
use Illuminate\Database\UniqueConstraintViolationException;

/**
 * The user's single primary memorisation place.
 *
 * Last-opened ayah and free practice can move around; this position only
 * advances when they continue their main journey or the recommender says so.
 */
class MainMemorisationPositionService
{
    public const METADATA_KEY = 'main_position';

    /**
     * @return array{surah_number: int, surah_name: string|null, ayah_start: int, ayah_end: int, source: string|null}|null
     */
    public function get(User $user, bool $persistInferred = true): ?array
    {
        $row = UserLastPosition::query()->where('user_id', $user->id)->first();
        $stored = $this->fromMetadata($row);
        if ($stored) {
            return $stored;
        }

        $inferred = $this->infer($user, $row);
        if ($inferred && $persistInferred) {
            $this->save($user, $inferred);
        }

        return $inferred;
    }

    /**
     * @param  array<string, mixed>  $position
     * @return array{surah_number: int, surah_name: string|null, ayah_start: int, ayah_end: int, source: string|null}|null
     */
    public function save(User $user, array $position): ?array
    {
        $normalized = $this->normalize($position);
        if (! $normalized) {
            return null;
        }

        $row = UserLastPosition::query()->where('user_id', $user->id)->first();
        $metadata = is_array($row?->metadata) ? $row->metadata : [];
        $metadata[self::METADATA_KEY] = $normalized;

        $this->writeLastPosition($user, [
            'surah_number' => $row?->surah_number,
            'ayah_number' => $row?->ayah_number,
            'last_step' => $row?->last_step ?? 0,
            'metadata' => $metadata,
            'last_opened_at' => $row?->last_opened_at ?? now(),
        ]);

        return $normalized;
    }

    /**
     * Keep the stored main position when other writers replace metadata.
     *
     * @param  array<string, mixed>|null  $incoming
     * @param  array<string, mixed>|null  $existing
     * @return array<string, mixed>|null
     */
    public function mergePreservingMain(?array $incoming, ?array $existing): ?array
    {
        $existing = is_array($existing) ? $existing : [];
        if ($incoming === null) {
            return $existing === [] ? null : $existing;
        }

        $main = $incoming[self::METADATA_KEY] ?? $existing[self::METADATA_KEY] ?? null;
        $normalized = is_array($main) ? $this->normalize($main) : null;
        if ($normalized) {
            $incoming[self::METADATA_KEY] = $normalized;
        } else {
            unset($incoming[self::METADATA_KEY]);
        }

        return $incoming === [] ? null : $incoming;
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function writeLastPosition(User $user, array $attributes): UserLastPosition
    {
        $existing = UserLastPosition::query()->where('user_id', $user->id)->first();
        $incomingMeta = array_key_exists('metadata', $attributes)
            ? (is_array($attributes['metadata']) ? $attributes['metadata'] : null)
            : null;
        $attributes['metadata'] = $this->mergePreservingMain($incomingMeta, $existing?->metadata);

        try {
            return UserLastPosition::updateOrCreate(
                ['user_id' => $user->id],
                $attributes
            );
        } catch (UniqueConstraintViolationException $e) {
            $row = UserLastPosition::query()->where('user_id', $user->id)->first();
            if ($row) {
                $row->fill($attributes)->save();

                return $row;
            }

            throw $e;
        }
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function syncFromSessionPayload(User $user, UserSession $session, array $attributes = []): void
    {
        $meta = array_merge(
            is_array($session->metadata) ? $session->metadata : [],
            is_array($attributes['metadata'] ?? null) ? $attributes['metadata'] : []
        );
        $config = is_array($meta['config'] ?? null) ? $meta['config'] : [];
        $surah = (int) ($session->surah_number ?? $attributes['surah_number'] ?? $config['chapterId'] ?? 0);
        $from = (int) ($config['rangeStart'] ?? $attributes['ayah_number'] ?? $session->ayah_number ?? 0);
        $to = (int) ($config['rangeEnd'] ?? $from);
        $explicit = ! empty($meta['is_main_journey']) || ! empty($config['is_main_journey']);
        $mode = strtolower((string) ($session->memorisation_mode ?? $attributes['memorisation_mode'] ?? $meta['session_mode'] ?? ''));
        $isRevision = $mode === 'revision';

        $this->syncFromStartedSession($user, $surah, $from, $to, $explicit, $isRevision);
    }

    public function syncFromStartedSession(
        User $user,
        int $surah,
        int $from,
        int $to,
        bool $explicitMain,
        bool $isRevision = false,
    ): void {
        if ($surah <= 0 || $from <= 0) {
            return;
        }

        $to = max($from, $to);
        $current = $this->get($user);

        if ($explicitMain) {
            if ($isRevision && $current !== null && ! $this->overlaps($current, $surah, $from, $to)) {
                return;
            }

            $this->save($user, [
                'surah_number' => $surah,
                'ayah_start' => $from,
                'ayah_end' => $to,
                'source' => 'explicit',
            ]);

            return;
        }

        // A first random browse must not lock "your place". Only the opening
        // Fatihah set (or an explicit journey start) becomes the main position.
        if ($current === null) {
            if ($isRevision || ! $this->isOpeningFatihahRange($surah, $from, $to)) {
                return;
            }

            $this->save($user, [
                'surah_number' => $surah,
                'ayah_start' => $from,
                'ayah_end' => $to,
                'source' => 'first_session',
            ]);

            return;
        }

        if ($this->overlaps($current, $surah, $from, $to) || $this->isContinuation($current, $surah, $from, $to)) {
            $this->save($user, [
                'surah_number' => $surah,
                'ayah_start' => $from,
                'ayah_end' => $to,
                'source' => 'continue',
            ]);
        }
    }

    public function advanceFromRecommendation(User $user, SessionRecommendation $recommendation, ?UserSession $sourceSession = null): void
    {
        $type = RecommendationType::tryFrom((string) $recommendation->recommendation_type);
        if (! $type || (! $type->isContinue() && $type !== RecommendationType::NextSurah)) {
            return;
        }

        $current = $this->get($user);
        if ($current && $sourceSession) {
            $meta = is_array($sourceSession->metadata) ? $sourceSession->metadata : [];
            $config = is_array($meta['config'] ?? null) ? $meta['config'] : [];
            $surah = (int) ($sourceSession->surah_number ?? $config['chapterId'] ?? 0);
            $from = (int) ($config['rangeStart'] ?? $sourceSession->ayah_number ?? 0);
            $to = (int) ($config['rangeEnd'] ?? $from);
            if ($surah > 0 && ! $this->overlaps($current, $surah, $from, $to) && ! $this->isContinuation($current, $surah, $from, $to)) {
                return;
            }
        }

        $this->save($user, [
            'surah_number' => (int) $recommendation->surah_number,
            'ayah_start' => (int) $recommendation->ayah_start,
            'ayah_end' => (int) $recommendation->ayah_end,
            'source' => 'recommendation',
        ]);
    }

    /**
     * @param  array<string, mixed>  $position
     * @return array{remembered_count: int, range_ayah_count: int}
     */
    public function rememberedInRange(User $user, array $position): array
    {
        $surah = (int) ($position['surah_number'] ?? 0);
        $start = (int) ($position['ayah_start'] ?? 0);
        $end = (int) ($position['ayah_end'] ?? $start);
        $total = max(1, $end - $start + 1);
        $done = 0;
        if ($surah > 0 && $start > 0) {
            $done = MemorisationProgress::query()
                ->where('user_id', $user->id)
                ->where('surah_number', $surah)
                ->whereBetween('ayah_number', [$start, $end])
                ->whereIn('status', ['memorised', 'mastered'])
                ->count();
        }

        return [
            'remembered_count' => $done,
            'range_ayah_count' => $total,
        ];
    }

    /**
     * @return array{memorised_ayah_count: int, quran_ayah_count: int, percent: int}
     */
    public function overallProgress(User $user): array
    {
        $quran = QuranMetadata::totalAyahCount();
        $memorised = MemorisationProgress::query()
            ->where('user_id', $user->id)
            ->whereIn('status', ['memorised', 'mastered'])
            ->count();

        $percent = 0;
        if ($quran > 0 && $memorised > 0) {
            $percent = (int) max(1, min(100, (int) round(($memorised / $quran) * 100)));
        }

        return [
            'memorised_ayah_count' => $memorised,
            'quran_ayah_count' => $quran,
            'percent' => $percent,
        ];
    }

    /**
     * @param  array<string, mixed>  $main
     */
    public function overlaps(array $main, int $surah, int $from, int $to): bool
    {
        if ((int) ($main['surah_number'] ?? 0) !== $surah) {
            return false;
        }

        $start = (int) ($main['ayah_start'] ?? 0);
        $end = (int) ($main['ayah_end'] ?? $start);

        return $from <= $end && $to >= $start;
    }

    /**
     * @param  array<string, mixed>  $main
     */
    public function isContinuation(array $main, int $surah, int $from, int $to): bool
    {
        $mainSurah = (int) ($main['surah_number'] ?? 0);
        $end = (int) ($main['ayah_end'] ?? $main['ayah_start'] ?? 0);
        if ($surah === $mainSurah && $from === $end + 1) {
            return true;
        }

        $next = QuranMetadata::nextSurah($mainSurah);

        return $next !== null && $surah === (int) $next['id'] && $from === 1;
    }

    private function isOpeningFatihahRange(int $surah, int $from, int $to): bool
    {
        return $surah === 1 && $from === 1 && $to >= 1 && $to <= 7;
    }

    /**
     * @return array{surah_number: int, surah_name: string|null, ayah_start: int, ayah_end: int, source: string|null}|null
     */
    private function fromMetadata(?UserLastPosition $row): ?array
    {
        $meta = is_array($row?->metadata) ? $row->metadata : [];

        return $this->normalize($meta[self::METADATA_KEY] ?? null);
    }

    /**
     * @return array{surah_number: int, surah_name: string|null, ayah_start: int, ayah_end: int, source: string|null}|null
     */
    private function infer(User $user, ?UserLastPosition $row): ?array
    {
        $rec = SessionRecommendation::query()
            ->where('user_id', $user->id)
            ->whereIn('recommendation_type', [
                RecommendationType::Continue->value,
                RecommendationType::ContinueNextRange->value,
                RecommendationType::NextSurah->value,
                RecommendationType::CompleteSurah->value,
            ])
            ->latest('id')
            ->first();
        if ($rec && (int) $rec->surah_number > 0) {
            return $this->normalize([
                'surah_number' => $rec->surah_number,
                'ayah_start' => $rec->ayah_start,
                'ayah_end' => $rec->ayah_end,
                'source' => 'inferred_recommendation',
            ]);
        }

        $completed = UserSession::query()
            ->where('user_id', $user->id)
            ->where('is_onboarding_example', false)
            ->where('status', UserSessionStatus::Completed->value)
            ->where(function ($query) {
                $query->whereNull('memorisation_mode')
                    ->orWhere('memorisation_mode', '!=', 'revision');
            })
            ->latest('last_activity_at')
            ->latest('id')
            ->first();
        if ($completed && ($fromSession = $this->fromSession($completed))) {
            $fromSession['source'] = 'inferred_session';

            return $fromSession;
        }

        $unfinished = UserSession::query()
            ->where('user_id', $user->id)
            ->where('is_onboarding_example', false)
            ->whereIn('status', UserSessionStatus::unfinishedDatabaseValues())
            ->latest('last_activity_at')
            ->latest('id')
            ->first();
        if ($unfinished && ($fromSession = $this->fromSession($unfinished))) {
            if ($this->sessionLooksLikeMainJourney($unfinished, $fromSession)) {
                $fromSession['source'] = 'inferred_session';

                return $fromSession;
            }
        }

        if ($row && (int) $row->surah_number > 0) {
            $meta = is_array($row->metadata) ? $row->metadata : [];
            $start = (int) ($meta['rangeStart'] ?? $row->ayah_number ?? 0);
            $end = (int) ($meta['rangeEnd'] ?? $start);
            if ($start > 0 && $this->isOpeningFatihahRange((int) $row->surah_number, $start, $end)) {
                return $this->normalize([
                    'surah_number' => $row->surah_number,
                    'ayah_start' => $start,
                    'ayah_end' => $end,
                    'source' => 'inferred_position',
                ]);
            }
        }

        $any = UserSession::query()
            ->where('user_id', $user->id)
            ->where('is_onboarding_example', false)
            ->latest('last_activity_at')
            ->first();
        if ($any && ($fromSession = $this->fromSession($any))) {
            if ($this->sessionLooksLikeMainJourney($any, $fromSession)) {
                $fromSession['source'] = 'inferred_session';

                return $fromSession;
            }
        }

        return null;
    }

    /**
     * @param  array{surah_number?: int, ayah_start?: int, ayah_end?: int}  $fromSession
     */
    private function sessionLooksLikeMainJourney(UserSession $session, array $fromSession): bool
    {
        $meta = is_array($session->metadata) ? $session->metadata : [];
        $config = is_array($meta['config'] ?? null) ? $meta['config'] : [];
        if (! empty($meta['is_main_journey']) || ! empty($config['is_main_journey'])) {
            return true;
        }

        return $this->isOpeningFatihahRange(
            (int) ($fromSession['surah_number'] ?? 0),
            (int) ($fromSession['ayah_start'] ?? 0),
            (int) ($fromSession['ayah_end'] ?? 0),
        );
    }

    /**
     * @return array{surah_number: int, surah_name: string|null, ayah_start: int, ayah_end: int, source: string|null}|null
     */
    private function fromSession(UserSession $session): ?array
    {
        $meta = is_array($session->metadata) ? $session->metadata : [];
        $config = is_array($meta['config'] ?? null) ? $meta['config'] : [];
        $surah = (int) ($session->surah_number ?? $config['chapterId'] ?? 0);
        $start = (int) ($config['rangeStart'] ?? $session->ayah_number ?? 0);
        $end = (int) ($config['rangeEnd'] ?? $start);

        return $this->normalize([
            'surah_number' => $surah,
            'ayah_start' => $start,
            'ayah_end' => $end,
        ]);
    }

    /**
     * @return array{surah_number: int, surah_name: string|null, ayah_start: int, ayah_end: int, source: string|null}|null
     */
    private function normalize(mixed $position): ?array
    {
        if (! is_array($position)) {
            return null;
        }

        $surah = (int) ($position['surah_number'] ?? $position['surah'] ?? 0);
        $start = (int) ($position['ayah_start'] ?? $position['from'] ?? 0);
        $end = (int) ($position['ayah_end'] ?? $position['to'] ?? $start);
        if ($surah <= 0 || $start <= 0 || ! QuranMetadata::isValidAyah($surah, $start)) {
            return null;
        }

        $max = QuranMetadata::ayahCount($surah) ?? $start;
        $end = max($start, min($end, $max));

        return [
            'surah_number' => $surah,
            'surah_name' => QuranMetadata::name($surah),
            'ayah_start' => $start,
            'ayah_end' => $end,
            'source' => isset($position['source']) ? (string) $position['source'] : null,
        ];
    }
}
