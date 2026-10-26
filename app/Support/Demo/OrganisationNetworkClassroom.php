<?php

namespace App\Support\Demo;

use App\Enums\AssignmentKind;
use App\Enums\AssignmentStatus;
use App\Enums\TeacherNoteKind;
use App\Enums\UserSessionStatus;
use App\Models\AiReciteAttempt;
use App\Models\MemorisationAssessment;
use App\Models\MemorisationPracticePlan;
use App\Models\MemorisationProgress;
use App\Models\MemorisationWeakSpot;
use App\Models\TeacherAssignment;
use App\Models\TeacherAssignmentRecipient;
use App\Models\TeacherNote;
use App\Models\User;
use App\Models\UserLastPosition;
use App\Models\UserSession;
use App\Services\Memorisation\RecitationScoringThresholds;
use App\Support\QuranMetadata;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Practice, AI recitation, weak spots, revisions, and saved sessions
 * for organisation-network demo students.
 */
final class OrganisationNetworkClassroom
{
    /**
     * @param  list<int>  $userIds
     */
    public function purgeActivity(array $userIds): void
    {
        if ($userIds === []) {
            return;
        }

        $tables = [
            'teacher_notes' => ['teacher_id', 'student_id'],
            'teacher_assignment_recipients' => ['student_id'],
            'teacher_assignments' => ['teacher_id'],
            'ai_recite_attempts' => ['user_id'],
            'memorisation_practice_plans' => ['user_id'],
            'memorisation_weak_spots' => ['user_id'],
            'memorisation_progress' => ['user_id'],
            'memorisation_assessments' => ['user_id'],
            'user_sessions' => ['user_id'],
            'user_last_positions' => ['user_id'],
        ];

        foreach ($tables as $table => $columns) {
            if (! Schema::hasTable($table)) {
                continue;
            }
            DB::table($table)->where(function ($query) use ($columns, $userIds) {
                foreach ($columns as $index => $column) {
                    if ($index === 0) {
                        $query->whereIn($column, $userIds);
                    } else {
                        $query->orWhereIn($column, $userIds);
                    }
                }
            })->delete();
        }
    }

    /**
     * @param  array{key: string, name: string, email: string, number: int, profile: string, ordinal: int}  $definition
     */
    public function plantStudent(User $student, User $teacher, array $definition): void
    {
        $range = OrganisationNetworkCatalog::practiceRange($definition['number']);
        $moments = $this->sessionMoments($definition);

        foreach ($moments as $index => $moment) {
            $this->session($student, $definition, $range, $moment, $index, false);
        }

        if ($definition['profile'] !== 'new') {
            $this->session(
                $student,
                $definition,
                OrganisationNetworkCatalog::SAVED_RANGE,
                now()->subHours(6 + ($definition['number'] % 8)),
                count($moments),
                true,
            );
        }

        $scored = [];
        foreach ($this->attemptPlan($definition, $moments) as $index => $plan) {
            $scored[] = $this->attempt($student, $definition, $plan, $index + 1);
        }

        $this->progress($student, $definition, $range);
        $this->weakSpots($student, $scored, $range);
        $this->revisionPlan($student, $definition, $range, $moments[0] ?? now()->subDays(12));
        $this->lastPosition($student, $range);
        $this->assignment($teacher, $student, $definition, $range);
        $this->feedback($teacher, $student, $definition);
    }

    /**
     * @param  array{number: int, profile: string, ordinal: int}  $definition
     * @return list<Carbon>
     */
    private function sessionMoments(array $definition): array
    {
        $count = OrganisationNetworkCatalog::ACTIVITY[$definition['profile']]['sessions'];
        $moments = [];
        for ($i = 0; $i < $count; $i++) {
            $days = $this->dayOffset($definition, $i, $count);
            $moments[] = now()->subDays($days)->subMinutes(12 + ($i * 4));
        }
        usort($moments, fn (Carbon $left, Carbon $right) => $left->getTimestamp() <=> $right->getTimestamp());

        return $moments;
    }

    /**
     * @param  array{number: int, profile: string, ordinal: int}  $definition
     */
    private function dayOffset(array $definition, int $index, int $count): int
    {
        if ($definition['profile'] === 'inactive') {
            return 10 + (int) round($index * 16 / max(1, $count - 1));
        }
        if ($definition['profile'] === 'new') {
            return $index === 0 ? 2 : 0;
        }

        return (int) round($index * 26 / max(1, $count - 1));
    }

    /**
     * @param  array{number: int, email: string}  $definition
     * @param  array{surah: int, from: int, to: int}  $range
     */
    private function session(User $user, array $definition, array $range, Carbon $at, int $index, bool $saved): void
    {
        $session = new UserSession;
        $session->forceFill([
            'user_id' => $user->id,
            'surah_number' => $range['surah'],
            'ayah_number' => $saved ? $range['from'] : $range['to'],
            'current_step' => $saved ? 2 : 4,
            'memorisation_mode' => 'advanced',
            'status' => $saved ? UserSessionStatus::Paused : UserSessionStatus::Completed,
            'is_onboarding_example' => false,
            'repetitions_completed' => $saved ? 1 : 5,
            'session_duration_seconds' => $saved ? 240 : (420 + (($definition['number'] + $index) % 9) * 45),
            'last_activity_at' => $at,
            'started_at' => $at->copy()->subMinutes($saved ? 8 : 14),
            'paused_at' => $saved ? $at : null,
            'ended_at' => $saved ? null : $at,
            'attempt_number' => $index + 1,
            'start_idempotency_key' => 'org-network:'.$definition['email'].':session:'.$index.($saved ? ':saved' : ''),
            'metadata' => [
                'range_start' => $range['from'],
                'range_end' => $range['to'],
                'config' => [
                    'rangeStart' => $range['from'],
                    'rangeEnd' => $range['to'],
                ],
            ],
            'created_at' => $at,
            'updated_at' => $at,
        ])->save();
    }

    /**
     * @param  array{number: int, profile: string, ordinal: int}  $definition
     * @param  list<Carbon>  $moments
     * @return list<array{at: Carbon, accuracy: int, range: array{surah: int, from: int, to: int}, mistakes: list<array<string, mixed>>}>
     */
    private function attemptPlan(array $definition, array $moments): array
    {
        $count = OrganisationNetworkCatalog::ACTIVITY[$definition['profile']]['attempts'];
        if ($count === 0 || $moments === []) {
            return [];
        }

        $picked = [];
        $total = count($moments);
        for ($i = 0; $i < $count; $i++) {
            $index = (int) round($i * ($total - 1) / max(1, $count - 1));
            $picked[] = $moments[$index]->copy()->addSeconds($i + 2);
        }

        $plan = [];
        foreach ($picked as $index => $moment) {
            $range = OrganisationNetworkCatalog::practiceRange($definition['number']);
            $accuracy = $this->accuracy($definition, $index);
            $plan[] = [
                'at' => $moment,
                'accuracy' => $accuracy,
                'range' => $range,
                'mistakes' => $this->mistakes($definition, $index, $range, $accuracy),
            ];
        }

        return $plan;
    }

    /**
     * @param  array{profile: string, ordinal: int}  $definition
     */
    private function accuracy(array $definition, int $index): int
    {
        $band = OrganisationNetworkCatalog::ACTIVITY[$definition['profile']];
        $span = $band['max'] - $band['min'];

        return $band['min'] + (($definition['ordinal'] + ($index * 2)) % ($span + 1));
    }

    /**
     * @param  array{profile: string, ordinal: int}  $definition
     * @param  array{surah: int, from: int, to: int}  $range
     * @return list<array<string, mixed>>
     */
    private function mistakes(array $definition, int $index, array $range, int $accuracy): array
    {
        if ($accuracy >= 90) {
            return $index === 0 ? [$this->mistake($range, $range['from'], 1, 'incorrect', 'الله')] : [];
        }

        $items = [
            $this->mistake($range, $range['from'], 1, 'incorrect', 'الله'),
        ];
        if ($accuracy < 80) {
            $items[] = $this->mistake($range, $range['from'], 2, 'skipped', 'رب');
        }
        if ($accuracy < 65) {
            $items[] = $this->mistake($range, min($range['to'], $range['from'] + 1), 1, 'extra', 'و');
            $items[] = $this->mistake($range, $range['from'], 3, 'repeated', 'الرحمن');
        }

        return $items;
    }

    /**
     * @param  array{surah: int, from: int, to: int}  $range
     * @return array<string, mixed>
     */
    private function mistake(array $range, int $ayah, int $wordIndex, string $status, string $text): array
    {
        return [
            'surah' => $range['surah'],
            'ayah' => $ayah,
            'word_index' => $wordIndex,
            'status' => $status,
            'text' => $text,
        ];
    }

    /**
     * @param  array{email: string}  $definition
     * @param  array{at: Carbon, accuracy: int, range: array{surah: int, from: int, to: int}, mistakes: list<array<string, mixed>>}  $plan
     * @return array{at: Carbon, range: array{surah: int, from: int, to: int}, mistakes: list<array<string, mixed>>}
     */
    private function attempt(User $user, array $definition, array $plan, int $number): array
    {
        $wrong = 0;
        $skipped = 0;
        $extra = 0;
        $repeated = 0;
        $statuses = [];
        foreach ($plan['mistakes'] as $mistake) {
            $statuses[] = $mistake;
            match ($mistake['status']) {
                'incorrect' => $wrong++,
                'skipped' => $skipped++,
                'extra' => $extra++,
                'repeated' => $repeated++,
                default => null,
            };
        }
        $correct = max(0, (int) round($plan['accuracy'] / 8) - $wrong);
        for ($i = 0; $i < $correct; $i++) {
            $statuses[] = [
                'surah' => $plan['range']['surah'],
                'ayah' => $plan['range']['from'],
                'word_index' => 10 + $i,
                'status' => 'correct',
                'text' => 'word',
            ];
        }

        $attempt = new AiReciteAttempt;
        $attempt->forceFill([
            'user_id' => $user->id,
            'source' => AiReciteAttempt::SOURCE_DASHBOARD,
            'attempt_number' => $number,
            'accuracy_percent' => $plan['accuracy'],
            'band' => RecitationScoringThresholds::bandForAccuracy($plan['accuracy']),
            'peek_used' => false,
            'duration_ms' => 16000 + ($number * 400),
            'ayah_range' => [
                'surah' => $plan['range']['surah'],
                'from' => $plan['range']['from'],
                'to' => $plan['range']['to'],
                'surah_name' => QuranMetadata::name($plan['range']['surah']),
            ],
            'color_counts' => [
                'green' => $correct,
                'amber' => 0,
                'red' => $wrong,
                'black' => $skipped,
                'gray' => $extra,
            ],
            'weak_words' => array_values(array_filter(
                $plan['mistakes'],
                fn (array $mistake) => $mistake['status'] === 'incorrect'
            )),
            'word_statuses' => $statuses,
            'plan_snapshot' => null,
            'created_at' => $plan['at'],
            'updated_at' => $plan['at'],
        ])->save();

        return [
            'at' => $plan['at'],
            'range' => $plan['range'],
            'mistakes' => $plan['mistakes'],
        ];
    }

    /**
     * @param  array{profile: string}  $definition
     * @param  array{surah: int, from: int, to: int}  $range
     */
    private function progress(User $user, array $definition, array $range): void
    {
        for ($ayah = $range['from']; $ayah <= $range['to']; $ayah++) {
            $status = match ($definition['profile']) {
                'excellent', 'good' => 'memorised',
                'average' => $ayah === $range['from'] ? 'memorised' : 'learning',
                default => 'learning',
            };
            $row = new MemorisationProgress;
            $row->forceFill([
                'user_id' => $user->id,
                'surah_number' => $range['surah'],
                'ayah_number' => $ayah,
                'status' => $status,
                'mastery_level' => $status === 'memorised' ? 4 : 1,
                'repetitions' => $status === 'memorised' ? 10 : 2,
                'completed_at' => $status === 'memorised' ? now()->subDays(3) : null,
            ])->save();
        }
    }

    /**
     * @param  list<array{at: Carbon, range: array{surah: int, from: int, to: int}, mistakes: list<array<string, mixed>>}>  $attempts
     * @param  array{surah: int, from: int, to: int}  $range
     */
    private function weakSpots(User $user, array $attempts, array $range): void
    {
        $words = [];
        $ayahs = [];
        foreach ($attempts as $attempt) {
            foreach ($attempt['mistakes'] as $mistake) {
                if ($mistake['status'] !== 'incorrect') {
                    continue;
                }
                $wordKey = $mistake['surah'].':'.$mistake['ayah'].':'.$mistake['word_index'];
                $ayahKey = $mistake['surah'].':'.$mistake['ayah'];
                $words[$wordKey]['count'] = ($words[$wordKey]['count'] ?? 0) + 1;
                $words[$wordKey]['mistake'] = $mistake;
                $words[$wordKey]['first'] = $words[$wordKey]['first'] ?? $attempt['at'];
                $words[$wordKey]['last'] = $attempt['at'];
                $ayahs[$ayahKey]['count'] = ($ayahs[$ayahKey]['count'] ?? 0) + 1;
                $ayahs[$ayahKey]['surah'] = $mistake['surah'];
                $ayahs[$ayahKey]['ayah'] = $mistake['ayah'];
                $ayahs[$ayahKey]['first'] = $ayahs[$ayahKey]['first'] ?? $attempt['at'];
                $ayahs[$ayahKey]['last'] = $attempt['at'];
            }
        }

        foreach ($words as $spot) {
            $this->storeSpot(
                $user,
                MemorisationWeakSpot::TYPE_WORD,
                $spot['mistake']['surah'],
                $spot['mistake']['ayah'],
                $spot['mistake']['word_index'],
                $spot['count'],
                $spot['first'],
                $spot['last'],
            );
        }

        foreach ($ayahs as $spot) {
            if ($spot['count'] < 2) {
                continue;
            }
            $this->storeSpot(
                $user,
                MemorisationWeakSpot::TYPE_AYAH,
                $spot['surah'],
                $spot['ayah'],
                null,
                $spot['count'],
                $spot['first'],
                $spot['last'],
            );
        }

        if ($attempts === []) {
            $this->storeSpot(
                $user,
                MemorisationWeakSpot::TYPE_AYAH,
                $range['surah'],
                $range['from'],
                null,
                1,
                now()->subDays(2),
                now()->subDay(),
            );
        }
    }

    private function storeSpot(User $user, string $type, int $surah, int $ayah, ?int $wordIndex, int $count, Carbon $first, Carbon $last): void
    {
        $spot = new MemorisationWeakSpot;
        $spot->forceFill([
            'user_id' => $user->id,
            'spot_type' => $type,
            'surah_number' => $surah,
            'ayah_number' => $ayah,
            'word_index' => $wordIndex,
            'verse_key' => $surah.':'.$ayah,
            'spot_key' => MemorisationWeakSpot::buildSpotKey($type, $surah, $ayah, $wordIndex),
            'severity' => $count >= 3 ? 'high' : ($count >= 2 ? 'moderate' : 'low'),
            'status' => MemorisationWeakSpot::STATUS_ACTIVE,
            'trend' => $count >= 3 ? 'regressing' : ($count === 1 ? 'improving' : 'stable'),
            'affected_attempt_count' => $count,
            'first_identified_at' => $first,
            'last_identified_at' => $last,
            'last_recalled_at' => $last,
        ])->save();
    }

    /**
     * @param  array{profile: string, number: int}  $definition
     * @param  array{surah: int, from: int, to: int}  $range
     */
    private function revisionPlan(User $user, array $definition, array $range, Carbon $identified): void
    {
        if ($definition['profile'] === 'new') {
            return;
        }

        $overdue = in_array($definition['profile'], ['average', 'struggling', 'inactive'], true);
        $reviewRange = $overdue ? OrganisationNetworkCatalog::OVERDUE_RANGE : $range;
        $reviewAt = $overdue ? now()->subDays(2 + ($definition['number'] % 4)) : now()->addDays(4);

        $assessment = new MemorisationAssessment;
        $assessment->forceFill([
            'user_id' => $user->id,
            'surah_number' => $reviewRange['surah'],
            'start_ayah' => $reviewRange['from'],
            'end_ayah' => $reviewRange['to'],
            'assessment_type' => 'memorisation_detection',
            'status' => MemorisationAssessment::STATUS_COMPLETED,
            'idempotency_key' => 'org-network-plan-'.$user->id,
            'surah_name' => QuranMetadata::name($reviewRange['surah']),
            'overall_accuracy' => $overdue ? 61 : 91,
            'friendly_summary' => 'Revision plan for '.$this->rangeLabel($reviewRange).'.',
            'created_at' => $identified,
            'updated_at' => $identified,
        ])->save();

        $plan = new MemorisationPracticePlan;
        $plan->forceFill([
            'user_id' => $user->id,
            'assessment_id' => $assessment->id,
            'title' => 'Revisit '.$this->rangeLabel($reviewRange),
            'explanation' => $overdue
                ? 'This range is overdue for muraja\'ah.'
                : 'Scheduled muraja\'ah for a range this student already practises.',
            'status' => MemorisationPracticePlan::STATUS_ACTIVE,
            'practice_scope' => MemorisationPracticePlan::SCOPE_FULL_RANGE,
            'surah_number' => $reviewRange['surah'],
            'start_ayah' => $reviewRange['from'],
            'end_ayah' => $reviewRange['to'],
            'recommended_review_at' => $reviewAt,
            'accepted_at' => $identified,
            'created_at' => $identified,
            'updated_at' => $identified,
        ])->save();
    }

    /**
     * @param  array{surah: int, from: int, to: int}  $range
     */
    private function lastPosition(User $user, array $range): void
    {
        $position = UserLastPosition::query()->where('user_id', $user->id)->first() ?? new UserLastPosition;
        $position->forceFill([
            'user_id' => $user->id,
            'surah_number' => $range['surah'],
            'ayah_number' => $range['from'],
            'last_step' => 2,
            'last_opened_at' => now()->subHours(5),
            'metadata' => [
                'range_start' => $range['from'],
                'range_end' => $range['to'],
            ],
        ])->save();
    }

    /**
     * @param  array{profile: string, number: int}  $definition
     * @param  array{surah: int, from: int, to: int}  $range
     */
    private function assignment(User $teacher, User $student, array $definition, array $range): void
    {
        $createdAt = now()->subDays(5);
        $dueAt = in_array($definition['profile'], ['struggling', 'inactive'], true)
            ? now()->subDay()
            : now()->addDays(6);

        $assignment = new TeacherAssignment;
        $assignment->forceFill([
            'teacher_id' => $teacher->id,
            'organisation_id' => $teacher->organisation_id,
            'kind' => AssignmentKind::AiRecite,
            'hifz_category' => 'sabqi',
            'surah_number' => $range['surah'],
            'ayah_start' => $range['from'],
            'ayah_end' => $range['to'],
            'repetition_target' => 1,
            'due_at' => $dueAt,
            'feedback' => 'Keep the same ayah range and recite it once more this week.',
            'created_at' => $createdAt,
            'updated_at' => $createdAt,
        ])->save();

        $recipient = new TeacherAssignmentRecipient;
        $recipient->forceFill([
            'teacher_assignment_id' => $assignment->id,
            'student_id' => $student->id,
            'status' => AssignmentStatus::Pending,
            'created_at' => $createdAt,
            'updated_at' => $createdAt,
        ])->save();
    }

    /**
     * @param  array{profile: string, name: string}  $definition
     */
    private function feedback(User $teacher, User $student, array $definition): void
    {
        $note = new TeacherNote;
        $note->forceFill([
            'teacher_id' => $teacher->id,
            'student_id' => $student->id,
            'organisation_id' => $teacher->organisation_id,
            'kind' => TeacherNoteKind::Feedback,
            'body' => match ($definition['profile']) {
                'excellent' => 'Strong recitation this week. Keep the same muraja\'ah rhythm.',
                'good' => 'Solid accuracy. Repeat the same range once more before moving on.',
                'average' => 'Focus on the weak words from the last AI recitation before the next session.',
                'struggling' => 'Slow the recitation and repeat the missed words in isolation.',
                'inactive' => 'Welcome back — start with a short saved session rather than a new surah.',
                default => 'First sessions look promising. Recite the same ayahs once more tomorrow.',
            },
        ])->save();
    }

    /**
     * @param  array{surah: int, from: int, to: int}  $range
     */
    private function rangeLabel(array $range): string
    {
        return QuranMetadata::name($range['surah']).' '.$range['from'].'–'.$range['to'];
    }
}
