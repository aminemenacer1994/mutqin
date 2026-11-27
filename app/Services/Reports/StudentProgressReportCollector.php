<?php

namespace App\Services\Reports;

use App\Enums\AssignmentStatus;
use App\Models\AiReciteAttempt;
use App\Models\TeacherAssignmentRecipient;
use App\Models\TeacherRecitationAssessment;
use App\Models\User;
use App\Services\Parent\ParentLearningReportCollector;
use App\Services\Parent\ParentLearningReportPeriods;
use App\Services\Teacher\StudentHifzProgressService;
use App\Services\Teacher\TeacherReportService;
use App\Support\ScoredAttemptIdentity;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;

/**
 * Unified period snapshot for teacher-approved individual student reports.
 * Counts come from existing records; nothing is fabricated.
 */
class StudentProgressReportCollector
{
    public const PAYLOAD_VERSION = 1;

    /** @var list<string> */
    public const CATEGORY_KEYS = ['sabaq', 'sabqi', 'manzil', 'nazra', 'tajweed', 'memorisation'];

    public function __construct(
        private readonly ParentLearningReportCollector $parentCollector,
        private readonly ParentLearningReportPeriods $periods,
        private readonly TeacherReportService $teacherReports,
        private readonly StudentHifzProgressService $hifz,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function collect(User $teacher, User $student, string $periodType, Carbon $from, Carbon $to): array
    {
        $fromDay = $from->copy()->startOfDay();
        $toDay = $to->copy()->endOfDay();
        $fromKey = $fromDay->toDateString();
        $toKey = $toDay->toDateString();

        $comparisonCadence = $periodType === 'month' ? 'month' : 'week';
        $parentSnapshot = $this->parentCollector->collect($student, $comparisonCadence, $fromDay, $toDay);
        $teacherSummary = $this->teacherReports->summary($teacher, $student, $fromKey, $toKey);
        $hifzPeriod = $this->hifz->period($teacher, $student, $fromDay, $toDay);
        $categories = $this->categories($teacher, $student, $fromDay, $toDay, $hifzPeriod);
        [$previousFrom, $previousTo] = $this->previousWindow($periodType, $fromDay, $toDay);

        $previousSummary = $this->teacherReports->summary(
            $teacher,
            $student,
            $previousFrom->toDateString(),
            $previousTo->toDateString(),
        );

        return [
            'version' => self::PAYLOAD_VERSION,
            'period' => [
                'type' => $periodType,
                'start' => $fromKey,
                'end' => $toKey,
            ],
            'student' => [
                'id' => (int) $student->id,
                'name' => (string) $student->name,
            ],
            'summary' => [
                'sessions_recorded' => (int) ($teacherSummary['sessions_recorded'] ?? 0),
                'scored_checks' => (int) ($teacherSummary['scored_checks'] ?? 0),
                'ai_word_match_average' => $teacherSummary['ai_word_match_average'] ?? null,
                'teacher_tajweed_average' => $teacherSummary['teacher_tajweed_average'] ?? null,
                'tasks_assigned' => (int) ($teacherSummary['tasks_assigned'] ?? 0),
                'attendance' => is_array($teacherSummary['attendance'] ?? null) ? $teacherSummary['attendance'] : [],
                'activity_chart' => $teacherSummary['activity_chart'] ?? null,
            ],
            'assignments' => $parentSnapshot['assignments'] ?? [],
            'activity' => $parentSnapshot['activity'] ?? [],
            'goals' => $parentSnapshot['goals'] ?? [],
            'feedback' => $parentSnapshot['feedback'] ?? [],
            'home_practice' => $parentSnapshot['home_practice'] ?? null,
            'wording' => $parentSnapshot['wording'] ?? [],
            'hifz' => $hifzPeriod,
            'categories' => $categories,
            'comparison' => $this->comparison($teacherSummary, $previousSummary, $parentSnapshot['comparison'] ?? []),
            'attention' => $parentSnapshot['attention'] ?? [],
            'strengths' => $this->strengths($categories, $hifzPeriod, $teacherSummary),
            'next_targets' => $this->nextTargets($categories, $parentSnapshot, $hifzPeriod),
            'recurring_mistakes' => $hifzPeriod['recurring_mistakes'] ?? [],
            'insufficient' => (bool) ($parentSnapshot['insufficient'] ?? false)
                && $this->categoriesEmpty($categories)
                && (int) ($teacherSummary['sessions_recorded'] ?? 0) === 0,
            'sources' => $this->sources($parentSnapshot['sources'] ?? [], $categories, $teacherSummary),
            'provenance' => $this->provenanceLegend(),
        ];
    }

    /**
     * @param  array<string, mixed>  $hifzPeriod
     * @return array<string, mixed>
     */
    private function categories(User $teacher, User $student, Carbon $from, Carbon $to, array $hifzPeriod): array
    {
        $recipients = TeacherAssignmentRecipient::query()
            ->where('student_id', $student->id)
            ->whereHas('assignment', function (Builder $query) use ($teacher, $from, $to) {
                $query->where('teacher_id', $teacher->id)
                    ->where(function (Builder $window) use ($from, $to) {
                        $window->whereBetween('created_at', [$from, $to])
                            ->orWhereBetween('due_at', [$from, $to]);
                    });
            })
            ->with('assignment:id,activity,hifz_category,surah_number,ayah_start,ayah_end,due_at')
            ->get();

        $blocks = [];
        foreach (self::CATEGORY_KEYS as $key) {
            $blocks[$key] = $this->emptyCategory($key);
        }

        foreach ($recipients as $recipient) {
            $bucket = $this->resolveCategory($recipient);
            if ($bucket === null || ! isset($blocks[$bucket])) {
                continue;
            }
            $status = $recipient->status instanceof AssignmentStatus
                ? $recipient->status->value
                : (string) $recipient->status;
            $blocks[$bucket]['assigned']++;
            if ($status === AssignmentStatus::Completed->value) {
                $blocks[$bucket]['completed']++;
            }
            $due = $recipient->assignment?->due_at;
            if (in_array($status, [AssignmentStatus::Pending->value, AssignmentStatus::InProgress->value], true)
                && $due !== null && $due->lte($to)) {
                $blocks[$bucket]['open']++;
            }
        }

        foreach ($blocks as $key => &$block) {
            $assigned = (int) $block['assigned'];
            $block['completion_percent'] = $assigned > 0
                ? (int) round(100 * (int) $block['completed'] / $assigned)
                : null;
            $block['denominator'] = 'tasks_in_period';
        }
        unset($block);

        $blocks['tajweed'] = array_merge($blocks['tajweed'], $this->tajweedAssessments($teacher, $student, $from, $to));
        $blocks['memorisation'] = array_merge($blocks['memorisation'], $this->memorisationExtras($blocks['sabaq'], $hifzPeriod));

        $wording = $this->categoryWording($student, $from, $to);
        foreach (['sabaq', 'sabqi', 'manzil', 'nazra'] as $key) {
            if (($blocks[$key]['assigned'] ?? 0) > 0) {
                $blocks[$key]['ai_word_match_average'] = $wording['average'];
                $blocks[$key]['ai_word_match_count'] = $wording['count'];
            }
        }

        return $blocks;
    }

  /**
     * @return array{average: ?float, count: int}
     */
    private function categoryWording(User $student, Carbon $from, Carbon $to): array
    {
        $attempts = AiReciteAttempt::query()->validScored()
            ->where('user_id', $student->id)
            ->whereBetween('created_at', [$from, $to])
            ->get()
            ->sortByDesc('id')
            ->unique(fn (AiReciteAttempt $attempt) => ScoredAttemptIdentity::key($attempt));

        if ($attempts->isEmpty()) {
            return ['average' => null, 'count' => 0];
        }

        return [
            'average' => round((float) $attempts->avg('accuracy_percent'), 1),
            'count' => $attempts->count(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function tajweedAssessments(User $teacher, User $student, Carbon $from, Carbon $to): array
    {
        $attemptIds = AiReciteAttempt::query()
            ->where('user_id', $student->id)
            ->whereBetween('created_at', [$from, $to])
            ->pluck('id');

        $scores = TeacherRecitationAssessment::query()
            ->where('teacher_id', $teacher->id)
            ->where('student_id', $student->id)
            ->whereIn('ai_recite_attempt_id', $attemptIds)
            ->whereNotNull('tajweed_score')
            ->pluck('tajweed_score');

        return [
            'teacher_assessed_count' => $scores->count(),
            'teacher_tajweed_average' => $scores->isEmpty() ? null : round((float) $scores->avg(), 1),
            'evidence' => $scores->isEmpty() ? 'unassessed' : 'teacher_verified',
        ];
    }

    /**
     * @param  array<string, mixed>  $sabaq
     * @param  array<string, mixed>  $hifzPeriod
     * @return array<string, mixed>
     */
    private function memorisationExtras(array $sabaq, array $hifzPeriod): array
    {
        $newly = (int) ($hifzPeriod['newly_memorised_ayahs'] ?? 0);
        $validated = (int) ($sabaq['completed'] ?? 0);

        return [
            'newly_memorised_ayahs' => $newly,
            'validated_sabaq_completed' => $validated,
            'evidence' => $newly > 0 || $validated > 0 ? 'teacher_verified' : 'unassessed',
        ];
    }

    private function resolveCategory(TeacherAssignmentRecipient $recipient): ?string
    {
        $assignment = $recipient->assignment;
        if ($assignment === null) {
            return null;
        }
        $activity = (string) ($assignment->activity ?? '');
        if ($activity === 'nazra') {
            return 'nazra';
        }
        if ($activity === 'tajweed') {
            return 'tajweed';
        }
        $category = (string) ($assignment->hifz_category ?? '');
        if (in_array($category, ['sabaq', 'sabqi', 'manzil'], true)) {
            return $category;
        }
        if ($activity === 'hifz' || $category === 'sabaq') {
            return 'sabaq';
        }

        return null;
    }

    /**
     * @return array<string, mixed>
     */
    private function emptyCategory(string $key): array
    {
        return [
            'key' => $key,
            'assigned' => 0,
            'completed' => 0,
            'open' => 0,
            'completion_percent' => null,
            'denominator' => 'tasks_in_period',
            'evidence' => in_array($key, ['tajweed', 'memorisation'], true) ? 'unassessed' : 'teacher_verified',
            'ai_word_match_average' => null,
            'ai_word_match_count' => 0,
            'teacher_assessed_count' => 0,
            'teacher_tajweed_average' => null,
        ];
    }

    /**
     * @param  array<string, mixed>  $current
     * @param  array<string, mixed>  $previous
     * @param  array<string, mixed>  $parentComparison
     * @return array<string, mixed>
     */
    private function comparison(array $current, array $previous, array $parentComparison): array
    {
        $sessionsDelta = (int) ($current['sessions_recorded'] ?? 0) - (int) ($previous['sessions_recorded'] ?? 0);
        $checksDelta = (int) ($current['scored_checks'] ?? 0) - (int) ($previous['scored_checks'] ?? 0);

        return array_merge($parentComparison, [
            'sessions_delta' => $sessionsDelta,
            'scored_checks_delta' => $checksDelta,
            'ai_word_match_current' => $current['ai_word_match_average'] ?? null,
            'ai_word_match_previous' => $previous['ai_word_match_average'] ?? null,
        ]);
    }

    /**
     * @param  array<string, array<string, mixed>>  $categories
     * @param  array<string, mixed>  $hifz
     * @param  array<string, mixed>  $summary
     * @return list<array{kind: string, label: string}>
     */
    private function strengths(array $categories, array $hifz, array $summary): array
    {
        $items = [];
        foreach (['sabaq', 'sabqi', 'manzil'] as $key) {
            $block = $categories[$key] ?? [];
            $percent = $block['completion_percent'] ?? null;
            if ($percent !== null && $percent >= 80 && (int) ($block['assigned'] ?? 0) >= 2) {
                $items[] = ['kind' => $key, 'label' => ucfirst($key).' tasks were completed steadily ('.$percent.'%).'];
            }
        }
        $rate = $summary['attendance']['rate_percent'] ?? null;
        if ($rate !== null && $rate >= 85) {
            $items[] = ['kind' => 'attendance', 'label' => 'Attendance stayed strong at '.$rate.'%.'];
        }
        if ((int) ($hifz['newly_memorised_ayahs'] ?? 0) > 0) {
            $items[] = ['kind' => 'memorisation', 'label' => (int) $hifz['newly_memorised_ayahs'].' new ayah(s) were marked memorised in this period.'];
        }

        return array_slice($items, 0, 5);
    }

    /**
     * @param  array<string, array<string, mixed>>  $categories
     * @param  array<string, mixed>  $parentSnapshot
     * @param  array<string, mixed>  $hifz
     * @return list<array{kind: string, label: string}>
     */
    private function nextTargets(array $categories, array $parentSnapshot, array $hifz): array
    {
        $items = [];
        foreach ($parentSnapshot['attention'] ?? [] as $row) {
            if (! is_array($row)) {
                continue;
            }
            $items[] = ['kind' => (string) ($row['kind'] ?? 'attention'), 'label' => (string) ($row['label'] ?? '')];
        }
        foreach (['sabqi', 'manzil'] as $key) {
            $open = (int) ($categories[$key]['open'] ?? 0);
            if ($open > 0) {
                $items[] = ['kind' => $key, 'label' => 'Finish '.$open.' open '.ucfirst($key).' task(s).'];
            }
        }
        foreach ($hifz['recurring_mistakes'] ?? [] as $mistake) {
            if (! is_array($mistake) || ($mistake['label'] ?? '') === '') {
                continue;
            }
            $items[] = ['kind' => 'mistake', 'label' => 'Review recurring spot: '.$mistake['label'].'.'];
            if (count($items) >= 6) {
                break;
            }
        }

        return array_slice($items, 0, 6);
    }

    /**
     * @param  list<array{kind: string, label: string}>  $parentSources
     * @param  array<string, array<string, mixed>>  $categories
     * @param  array<string, mixed>  $summary
     * @return list<array{kind: string, label: string}>
     */
    private function sources(array $parentSources, array $categories, array $summary): array
    {
        $sources = $parentSources;
        if (($summary['ai_word_match_average'] ?? null) !== null) {
            $sources[] = ['kind' => 'ai_word_match', 'label' => 'Automatic wording check (not Tajweed)'];
        }
        if (($summary['teacher_tajweed_average'] ?? null) !== null) {
            $sources[] = ['kind' => 'teacher_tajweed', 'label' => 'Teacher Tajweed assessment'];
        }
        foreach (self::CATEGORY_KEYS as $key) {
            if ((int) ($categories[$key]['assigned'] ?? 0) > 0) {
                $sources[] = ['kind' => 'category_'.$key, 'label' => ucfirst($key).' assignments'];
            }
        }

        $seen = [];
        $unique = [];
        foreach ($sources as $source) {
            $kind = (string) ($source['kind'] ?? '');
            if ($kind === '' || isset($seen[$kind])) {
                continue;
            }
            $seen[$kind] = true;
            $unique[] = $source;
        }

        return $unique;
    }

    /**
     * @return list<array{key: string, label: string}>
     */
    private function provenanceLegend(): array
    {
        return [
            ['key' => 'teacher_verified', 'label' => 'Marked or approved by the teacher'],
            ['key' => 'automated', 'label' => 'Generated from platform records (wording match, counts)'],
            ['key' => 'unassessed', 'label' => 'No verified data in this category for the period'],
        ];
    }

    /**
     * @param  array<string, array<string, mixed>>  $categories
     */
    private function categoriesEmpty(array $categories): bool
    {
        foreach ($categories as $block) {
            if ((int) ($block['assigned'] ?? 0) > 0) {
                return false;
            }
        }

        return true;
    }

    /**
     * @return array{0: Carbon, 1: Carbon}
     */
    private function previousWindow(string $periodType, Carbon $from, Carbon $to): array
    {
        if ($periodType === 'month') {
            return $this->periods->previous('month', $from);
        }
        if ($periodType === 'week') {
            return $this->periods->previous('week', $from);
        }

        $days = max(1, $from->diffInDays($to) + 1);
        $previousEnd = $from->copy()->subDay()->endOfDay();
        $previousStart = $previousEnd->copy()->subDays($days - 1)->startOfDay();

        return [$previousStart, $previousEnd];
    }
}