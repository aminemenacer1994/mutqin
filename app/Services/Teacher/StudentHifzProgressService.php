<?php

namespace App\Services\Teacher;

use App\Enums\AssignmentStatus;
use App\Models\AiReciteAttempt;
use App\Models\MemorisationProgress;
use App\Models\MemorisationWeakSpot;
use App\Models\TeacherAssignmentRecipient;
use App\Models\TeacherRecitationReview;
use App\Models\User;
use App\Support\QuranMetadata;
use Illuminate\Support\Carbon;

/**
 * Memorisation coverage comes only from memorisation_progress rows.
 * AI wording match is reported separately and is never a Tajweed grade.
 */
class StudentHifzProgressService
{
    public const RECENT_DAYS = 14;

    /**
     * @return array<string, mixed>
     */
    public function forProfile(User $teacher, User $student): array
    {
        $coverage = $this->coverage($student);
        $lessons = $this->lessons($teacher, $student);
        $weak = $this->confirmedWeak($student);

        return [
            'coverage' => $this->publicCoverage($coverage),
            'lessons' => $lessons,
            'weak_passages' => $weak,
            'next' => $this->nextActivity($coverage, $weak),
            'last_practice_at' => $lessons['last_completed_at'],
        ];
    }

    /**
     * Class totals use the same memorised / in-progress buckets as the student list.
     *
     * @param  array<int, array<string, mixed>>  $metrics
     * @return array<string, mixed>
     */
    public function classSummary(array $metrics): array
    {
        $memorised = 0;
        $learning = 0;
        $withMemorised = 0;
        foreach ($metrics as $row) {
            $memorisedAyahs = (int) ($row['memorised_ayahs'] ?? 0);
            $memorised += $memorisedAyahs;
            $learning += (int) ($row['learning_ayahs'] ?? 0);
            if ($memorisedAyahs > 0) {
                $withMemorised++;
            }
        }

        return [
            'source' => 'memorisation_progress',
            'students' => count($metrics),
            'students_with_memorised_ayahs' => $withMemorised,
            'memorised_ayahs' => $memorised,
            'in_progress_ayahs' => $learning,
            'mushaf_ayahs' => QuranMetadata::totalAyahCount(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function period(User $teacher, User $student, ?Carbon $from, ?Carbon $to): array
    {
        $coverage = $this->coverage($student);
        $due = TeacherAssignmentRecipient::query()
            ->where('student_id', $student->id)
            ->whereHas('assignment', function ($query) use ($teacher, $from, $to) {
                $query->where('teacher_id', $teacher->id)->whereNotNull('due_at');
                if ($from) {
                    $query->where('due_at', '>=', $from);
                }
                if ($to) {
                    $query->where('due_at', '<=', $to);
                }
            })
            ->with('assignment:id,surah_number,ayah_start,ayah_end,due_at,activity,hifz_category')
            ->get();

        $completed = 0;
        $missed = 0;
        $submitted = 0;
        foreach ($due as $recipient) {
            $status = $recipient->status instanceof AssignmentStatus
                ? $recipient->status->value
                : (string) $recipient->status;
            $dueAt = $recipient->assignment?->due_at;
            if ($status === AssignmentStatus::Completed->value) {
                $completed++;
            } elseif ($status === AssignmentStatus::AwaitingConfirmation->value) {
                $submitted++;
            } elseif ($dueAt !== null && $dueAt->isPast()) {
                $missed++;
            }
        }
        $dueCount = $due->count();

        $reviewed = 0;
        foreach ($coverage['rows'] as $row) {
            if (! $row['memorised'] || $row['last_review_at'] === null) {
                continue;
            }
            $at = Carbon::parse($row['last_review_at']);
            if (($from === null || $at->gte($from)) && ($to === null || $at->lte($to))) {
                $reviewed++;
            }
        }

        $newlyMemorised = 0;
        foreach ($coverage['rows'] as $row) {
            if (! $row['memorised'] || $row['completed_at'] === null) {
                continue;
            }
            $at = Carbon::parse($row['completed_at']);
            if (($from === null || $at->gte($from)) && ($to === null || $at->lte($to))) {
                $newlyMemorised++;
            }
        }

        $mistakes = app(TeacherWordCoachingService::class)->recurringTeacherMistakes($teacher, $student);
        $recurring = array_values(array_filter($mistakes, function (array $row) use ($from, $to) {
            if ((int) ($row['count'] ?? 0) < 2) {
                return false;
            }
            $last = $row['last_at'] ?? null;
            if ($last === null) {
                return $from === null && $to === null;
            }
            $at = Carbon::parse($last);
            if ($from && $at->lt($from)) {
                return false;
            }
            if ($to && $at->gt($to)) {
                return false;
            }

            return true;
        }));

        return [
            'from' => $from?->toDateString(),
            'to' => $to?->toDateString(),
            'coverage' => $this->publicCoverage($coverage),
            'tasks' => [
                'due' => $dueCount,
                'completed' => $completed,
                'missed' => $missed,
                'submitted' => $submitted,
                'completion_percent' => $dueCount > 0 ? (int) round(100 * $completed / $dueCount) : null,
                'denominator' => 'tasks_due',
            ],
            'revision' => [
                'reviewed_ayahs' => $reviewed,
                'memorised_ayahs' => $coverage['memorised_ayahs'],
                'percent' => $coverage['memorised_ayahs'] > 0
                    ? (int) round(100 * $reviewed / $coverage['memorised_ayahs'])
                    : null,
                'denominator' => 'memorised_ayahs',
            ],
            'newly_memorised_ayahs' => $newlyMemorised,
            'wording' => $this->wordingTrend($student, $from, $to),
            'recurring_mistakes' => array_slice($recurring, 0, 8),
            'recurring_mistake_count' => count($recurring),
            'submissions' => $this->submissions($teacher, $student, $from, $to),
            'reviews' => $this->reviews($teacher, $student, $from, $to),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function coverage(User $student): array
    {
        $cutoff = now()->subDays(self::RECENT_DAYS);
        $records = MemorisationProgress::query()
            ->where('user_id', $student->id)
            ->orderBy('surah_number')
            ->orderBy('ayah_number')
            ->get(['surah_number', 'ayah_number', 'status', 'metadata', 'completed_at', 'updated_at']);

        $rows = [];
        $lastProgress = null;
        foreach ($records as $record) {
            $meta = is_array($record->metadata) ? $record->metadata : [];
            $reviewAt = isset($meta['last_review_at']) ? (string) $meta['last_review_at'] : null;
            $status = (string) $record->status;
            $memorised = in_array($status, ['memorised', 'mastered'], true);
            $updated = $record->updated_at?->toIso8601String();
            if ($updated !== null && ($lastProgress === null || $updated > $lastProgress)) {
                $lastProgress = $updated;
            }
            $rows[] = [
                'surah_number' => (int) $record->surah_number,
                'ayah_number' => (int) $record->ayah_number,
                'status' => $status,
                'memorised' => $memorised,
                'mastered' => $status === 'mastered',
                'learning' => $status === 'learning',
                'reviewing' => $status === 'reviewing',
                'last_review_at' => $reviewAt,
                'recent_review' => $memorised && $reviewAt !== null && Carbon::parse($reviewAt)->gte($cutoff),
                'completed_at' => $record->completed_at?->toIso8601String(),
            ];
        }

        $memorisedRows = array_values(array_filter($rows, fn (array $row) => $row['memorised']));
        $learningRows = array_values(array_filter($rows, fn (array $row) => $row['learning']));
        $reviewingRows = array_values(array_filter($rows, fn (array $row) => $row['reviewing']));
        $recentRows = array_values(array_filter($memorisedRows, fn (array $row) => $row['recent_review']));
        $recentKeys = [];
        foreach ($recentRows as $row) {
            $recentKeys[$row['surah_number'].':'.$row['ayah_number']] = true;
        }
        $olderRows = array_values(array_filter(
            $memorisedRows,
            fn (array $row) => ! isset($recentKeys[$row['surah_number'].':'.$row['ayah_number']])
        ));
        $mushaf = QuranMetadata::totalAyahCount();
        $memorisedCount = count($memorisedRows);

        return [
            'source' => 'memorisation_progress',
            'recent_days' => self::RECENT_DAYS,
            'mushaf_ayahs' => $mushaf,
            'memorised_ayahs' => $memorisedCount,
            'mastered_ayahs' => count(array_filter($memorisedRows, fn (array $row) => $row['mastered'])),
            'learning_ayahs' => count($learningRows),
            'reviewing_ayahs' => count($reviewingRows),
            'coverage_percent' => $mushaf > 0 ? round(100 * $memorisedCount / $mushaf, 1) : 0,
            'ranges' => $this->limitRanges($this->ranges($memorisedRows)),
            'new_memorisation' => $this->limitRanges($this->ranges($learningRows)),
            'recent_revision' => $this->limitRanges($this->ranges($recentRows)),
            'older_revision' => $this->limitRanges($this->ranges($olderRows)),
            'last_progress_at' => $lastProgress,
            'rows' => $rows,
        ];
    }

    /**
     * @param  array<string, mixed>  $coverage
     * @return array<string, mixed>
     */
    private function publicCoverage(array $coverage): array
    {
        unset($coverage['rows']);

        return $coverage;
    }

    /**
     * @return array<string, mixed>
     */
    private function lessons(User $teacher, User $student): array
    {
        $recipients = TeacherAssignmentRecipient::query()
            ->where('student_id', $student->id)
            ->whereHas('assignment', fn ($query) => $query->where('teacher_id', $teacher->id))
            ->with('assignment:id,surah_number,ayah_start,ayah_end,activity,hifz_category,due_at')
            ->get();

        $completed = 0;
        $pending = 0;
        $lastCompleted = null;
        $next = null;
        foreach ($recipients as $recipient) {
            $status = $recipient->status instanceof AssignmentStatus
                ? $recipient->status->value
                : (string) $recipient->status;
            if ($status === AssignmentStatus::Completed->value) {
                $completed++;
                $at = $recipient->completed_at?->toIso8601String();
                if ($at !== null && ($lastCompleted === null || $at > $lastCompleted)) {
                    $lastCompleted = $at;
                }
                continue;
            }
            $pending++;
            $due = $recipient->assignment?->due_at?->toIso8601String();
            if ($next === null || ($due !== null && ($next['due_at'] === null || $due < $next['due_at']))) {
                $next = $this->presentLesson($recipient, $due);
            }
        }

        return [
            'completed' => $completed,
            'pending' => $pending,
            'last_completed_at' => $lastCompleted,
            'next' => $next,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function presentLesson(TeacherAssignmentRecipient $recipient, ?string $due): array
    {
        $assignment = $recipient->assignment;
        $surah = (int) ($assignment->surah_number ?? 0);
        $start = (int) ($assignment->ayah_start ?? 0);
        $end = (int) ($assignment->ayah_end ?: $start);

        return [
            'recipient_id' => (int) $recipient->id,
            'label' => trim(QuranMetadata::name($surah).' · '.$start.($end !== $start ? '–'.$end : '')),
            'activity' => $assignment?->activity,
            'hifz_category' => $assignment?->hifz_category,
            'due_at' => $due,
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function confirmedWeak(User $student): array
    {
        return MemorisationWeakSpot::query()
            ->where('user_id', $student->id)
            ->where('status', MemorisationWeakSpot::STATUS_ACTIVE)
            ->where('teacher_review_status', MemorisationWeakSpot::REVIEW_CONFIRMED)
            ->orderByDesc('affected_attempt_count')
            ->limit(8)
            ->get()
            ->map(fn (MemorisationWeakSpot $spot) => [
                'id' => (int) $spot->id,
                'surah_number' => (int) $spot->surah_number,
                'ayah_number' => (int) $spot->ayah_number,
                'label' => QuranMetadata::name((int) $spot->surah_number).' · '.(int) $spot->ayah_number,
                'count' => (int) $spot->affected_attempt_count,
                'source' => 'teacher_confirmed',
            ])
            ->all();
    }

    /**
     * @param  array<string, mixed>  $coverage
     * @param  list<array<string, mixed>>  $weak
     * @return array<string, mixed>|null
     */
    private function nextActivity(array $coverage, array $weak): ?array
    {
        if ($weak !== []) {
            $spot = $weak[0];
            $match = null;
            foreach ($coverage['rows'] ?? [] as $row) {
                if ($row['surah_number'] === $spot['surah_number'] && $row['ayah_number'] === $spot['ayah_number']) {
                    $match = $row;
                    break;
                }
            }
            $category = ($match && $match['memorised'] && ! $match['recent_review']) ? 'manzil' : 'sabqi';

            return [
                'source' => 'teacher_confirmed',
                'activity' => 'revision',
                'hifz_category' => $category,
                'surah_number' => $spot['surah_number'],
                'ayah_start' => $spot['ayah_number'],
                'ayah_end' => $spot['ayah_number'],
                'label' => $spot['label'],
            ];
        }

        $reviewing = $coverage['rows'] ?? [];
        foreach ($reviewing as $row) {
            if (! $row['reviewing']) {
                continue;
            }

            return [
                'source' => 'reviewing_progress',
                'activity' => 'revision',
                'hifz_category' => 'sabqi',
                'surah_number' => $row['surah_number'],
                'ayah_start' => $row['ayah_number'],
                'ayah_end' => $row['ayah_number'],
                'label' => QuranMetadata::name($row['surah_number']).' · '.$row['ayah_number'],
            ];
        }

        foreach ($coverage['rows'] ?? [] as $row) {
            if (! $row['learning']) {
                continue;
            }

            return [
                'source' => 'learning_progress',
                'activity' => 'hifz',
                'hifz_category' => 'sabaq',
                'surah_number' => $row['surah_number'],
                'ayah_start' => $row['ayah_number'],
                'ayah_end' => $row['ayah_number'],
                'label' => QuranMetadata::name($row['surah_number']).' · '.$row['ayah_number'],
            ];
        }

        return null;
    }

    /**
     * @return array<string, mixed>
     */
    private function wordingTrend(User $student, ?Carbon $from, ?Carbon $to): array
    {
        $attempts = AiReciteAttempt::query()->validScored()
            ->where('user_id', $student->id)
            ->when($from, fn ($query) => $query->where('created_at', '>=', $from))
            ->when($to, fn ($query) => $query->where('created_at', '<=', $to))
            ->orderBy('created_at')
            ->orderBy('id')
            ->get(['id', 'ayah_range', 'accuracy_percent', 'created_at']);

        $groups = [];
        foreach ($attempts as $attempt) {
            $range = is_array($attempt->ayah_range) ? $attempt->ayah_range : [];
            $surah = (int) ($range['surah'] ?? $range['surah_number'] ?? 0);
            $start = (int) ($range['from'] ?? $range['start'] ?? 0);
            $end = (int) ($range['to'] ?? $range['end'] ?? $start);
            if ($surah < 1 || $start < 1 || $attempt->accuracy_percent === null) {
                continue;
            }
            $key = $surah.'|'.$start.'|'.$end;
            $groups[$key] ??= [
                'surah_number' => $surah,
                'ayah_start' => $start,
                'ayah_end' => $end,
                'label' => QuranMetadata::name($surah).' · '.$start.($end !== $start ? '–'.$end : ''),
                'scores' => [],
            ];
            $groups[$key]['scores'][] = (float) $attempt->accuracy_percent;
        }

        $passages = [];
        $up = 0;
        $down = 0;
        foreach ($groups as $group) {
            if (count($group['scores']) < 2) {
                continue;
            }
            $first = $group['scores'][0];
            $last = $group['scores'][count($group['scores']) - 1];
            $delta = round($last - $first, 1);
            $direction = abs($delta) < 5 ? 'steady' : ($delta > 0 ? 'up' : 'down');
            if ($direction === 'up') {
                $up++;
            } elseif ($direction === 'down') {
                $down++;
            }
            $passages[] = [
                'label' => $group['label'],
                'checks' => count($group['scores']),
                'first' => round($first, 1),
                'latest' => round($last, 1),
                'delta' => $delta,
                'direction' => $direction,
            ];
        }

        $direction = 'insufficient';
        if ($passages !== []) {
            if ($up > 0 && $down === 0) {
                $direction = 'improving';
            } elseif ($down > 0 && $up === 0) {
                $direction = 'slipping';
            } elseif ($up > 0 && $down > 0) {
                $direction = 'mixed';
            } else {
                $direction = 'steady';
            }
        }

        return [
            'source' => 'ai_word_match',
            'is_tajweed' => false,
            'direction' => $direction,
            'comparable_passages' => count($passages),
            'passages' => array_slice($passages, 0, 6),
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function submissions(User $teacher, User $student, ?Carbon $from, ?Carbon $to): array
    {
        return TeacherAssignmentRecipient::query()
            ->where('student_id', $student->id)
            ->whereNotNull('student_completed_at')
            ->when($from, fn ($query) => $query->where('student_completed_at', '>=', $from))
            ->when($to, fn ($query) => $query->where('student_completed_at', '<=', $to))
            ->whereHas('assignment', fn ($query) => $query->where('teacher_id', $teacher->id))
            ->with('assignment:id,surah_number,ayah_start,ayah_end')
            ->latest('student_completed_at')
            ->limit(8)
            ->get()
            ->map(function (TeacherAssignmentRecipient $recipient) {
                $assignment = $recipient->assignment;
                $surah = (int) ($assignment->surah_number ?? 0);
                $start = (int) ($assignment->ayah_start ?? 0);
                $end = (int) ($assignment->ayah_end ?: $start);

                return [
                    'id' => (int) $recipient->id,
                    'label' => trim(QuranMetadata::name($surah).' · '.$start.($end !== $start ? '–'.$end : '')),
                    'at' => $recipient->student_completed_at?->toIso8601String(),
                ];
            })
            ->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function reviews(User $teacher, User $student, ?Carbon $from, ?Carbon $to): array
    {
        return TeacherRecitationReview::query()
            ->where('teacher_id', $teacher->id)
            ->where('student_id', $student->id)
            ->where('status', TeacherRecitationReview::REVIEWED)
            ->when($from, fn ($query) => $query->where('reviewed_at', '>=', $from))
            ->when($to, fn ($query) => $query->where('reviewed_at', '<=', $to))
            ->latest('reviewed_at')
            ->limit(8)
            ->get(['id', 'reviewed_at'])
            ->map(fn (TeacherRecitationReview $review) => [
                'id' => (int) $review->id,
                'at' => $review->reviewed_at?->toIso8601String(),
            ])
            ->all();
    }

    /**
     * @param  list<array<string, mixed>>  $rows
     * @return list<array<string, mixed>>
     */
    private function ranges(array $rows): array
    {
        $ranges = [];
        foreach ($rows as $row) {
            $last = $ranges === [] ? null : $ranges[count($ranges) - 1];
            if ($last && $last['surah_number'] === $row['surah_number'] && $last['ayah_end'] + 1 === $row['ayah_number']) {
                $ranges[count($ranges) - 1]['ayah_end'] = $row['ayah_number'];
                $ranges[count($ranges) - 1]['ayahs']++;
                continue;
            }
            $ranges[] = [
                'surah_number' => $row['surah_number'],
                'surah_name' => QuranMetadata::name($row['surah_number']),
                'ayah_start' => $row['ayah_number'],
                'ayah_end' => $row['ayah_number'],
                'ayahs' => 1,
            ];
        }

        return $ranges;
    }

    /**
     * @param  list<array<string, mixed>>  $ranges
     * @return array{items: list<array<string, mixed>>, total: int, omitted: int}
     */
    private function limitRanges(array $ranges): array
    {
        $items = array_slice($ranges, 0, 12);

        return [
            'items' => $items,
            'total' => count($ranges),
            'ayahs' => array_sum(array_column($ranges, 'ayahs')),
            'omitted' => max(0, count($ranges) - count($items)),
        ];
    }
}
