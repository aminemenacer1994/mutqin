<?php

namespace App\Services\Learning;

use App\Enums\AssignmentStatus;
use App\Enums\TeacherNoteKind;
use App\Models\LearningPlanItem;
use App\Models\StudentSelfAssessment;
use App\Models\TeacherAssignmentRecipient;
use App\Models\TeacherNote;
use App\Models\TeacherWordCoaching;
use App\Models\TeacherWordCoachingCorrection;
use App\Models\User;
use App\Support\QuranMetadata;

/**
 * Coaching history rows. Accuracy is included only when a stored word-match
 * result already exists elsewhere. These rows never invent a score.
 */
class LearningHistoryComposer
{
    /**
     * @return list<array<string, mixed>>
     */
    public function events(User $user, int $limit): array
    {
        $limit = max(1, min(200, $limit));
        $events = [];

        $assignmentRows = TeacherAssignmentRecipient::query()
            ->where('student_id', $user->id)
            ->where(function ($query) {
                $query->whereNotNull('student_completed_at')
                    ->orWhereNotNull('completed_at')
                    ->orWhere('status', AssignmentStatus::Completed->value)
                    ->orWhere('status', AssignmentStatus::AwaitingConfirmation->value);
            })
            ->with('assignment')
            ->latest('id')
            ->limit($limit)
            ->get();
        $assignmentIds = $assignmentRows->pluck('teacher_assignment_id')->filter()->unique()->values();
        $milestoneAssignmentIds = $assignmentIds->isEmpty()
            ? []
            : LearningPlanItem::query()
                ->where('is_milestone', true)
                ->whereIn('teacher_assignment_id', $assignmentIds)
                ->pluck('teacher_assignment_id')
                ->map(fn ($id) => (int) $id)
                ->all();

        $assignmentRows->each(function (TeacherAssignmentRecipient $recipient) use (&$events, $milestoneAssignmentIds) {
            $assignment = $recipient->assignment;
            if ($assignment === null) {
                return;
            }
            $at = $recipient->student_completed_at ?? $recipient->completed_at ?? $recipient->updated_at;
            if ($at === null) {
                return;
            }
            $activity = (string) ($assignment->activity ?? '');
            $evidence = is_array($recipient->completion_evidence) ? $recipient->completion_evidence : [];
            $submissions = is_array($evidence['submissions'] ?? null) ? $evidence['submissions'] : [];
            $milestone = in_array((int) $assignment->id, $milestoneAssignmentIds, true);
            $surah = (int) $assignment->surah_number;
            $events[] = [
                'id' => 'assignment-'.$recipient->id,
                'type' => $milestone ? 'milestone' : 'assignment',
                'authority' => 'teacher',
                'verified_mistake' => false,
                'is_tajweed_assessment' => false,
                'is_milestone' => $milestone,
                'surah_number' => $surah,
                'surah_name' => QuranMetadata::name($surah),
                'ayah_start' => (int) $assignment->ayah_start,
                'ayah_end' => (int) $assignment->ayah_end,
                'outcome_key' => $milestone ? 'milestone' : ($activity === 'revision' ? 'revision_attempt' : 'assignment_completed'),
                'outcome_params' => [
                    'activity' => $activity !== '' ? $activity : null,
                    'submissions' => count($submissions),
                ],
                'occurred_at' => $at->toIso8601String(),
                'href' => null,
            ];
        });

        TeacherNote::query()
            ->where('student_id', $user->id)
            ->where('kind', TeacherNoteKind::Feedback->value)
            ->latest('id')
            ->limit($limit)
            ->get()
            ->each(function (TeacherNote $note) use (&$events) {
                $body = trim((string) $note->body);
                $surah = $note->surah_number ? (int) $note->surah_number : null;
                $events[] = [
                    'id' => 'teacher-feedback-'.$note->id,
                    'type' => 'teacher_feedback',
                    'authority' => 'teacher',
                    'verified_mistake' => false,
                    'is_tajweed_assessment' => false,
                    'surah_number' => $surah,
                    'surah_name' => $surah ? QuranMetadata::name($surah) : null,
                    'ayah_start' => $note->ayah_start ? (int) $note->ayah_start : null,
                    'ayah_end' => $note->ayah_end ? (int) $note->ayah_end : null,
                    'outcome_key' => 'teacher_feedback',
                    'outcome_params' => [
                        'body' => $body === '' ? null : mb_substr(preg_replace('/\s+/u', ' ', $body) ?? $body, 0, 140),
                    ],
                    'occurred_at' => optional($note->created_at)->toIso8601String(),
                    'href' => null,
                ];
            });

        TeacherWordCoachingCorrection::query()
            ->whereHas('coaching', fn ($query) => $query->where('student_id', $user->id))
            ->with('coaching')
            ->latest('id')
            ->limit($limit)
            ->get()
            ->each(function (TeacherWordCoachingCorrection $correction) use (&$events) {
                $coaching = $correction->coaching;
                if ($coaching === null || $correction->finding === null) {
                    return;
                }
                $surah = (int) $coaching->surah_number;
                $events[] = [
                    'id' => 'teacher-finding-'.$correction->id,
                    'type' => 'teacher_finding',
                    'authority' => 'teacher',
                    'verified_mistake' => $correction->finding === 'difficulty',
                    'is_tajweed_assessment' => false,
                    'surah_number' => $surah,
                    'surah_name' => QuranMetadata::name($surah),
                    'ayah_start' => (int) $coaching->ayah_number,
                    'ayah_end' => (int) $coaching->ayah_number,
                    'outcome_key' => 'teacher_finding',
                    'outcome_params' => [
                        'focus' => $correction->focus,
                        'finding' => $correction->finding,
                    ],
                    'occurred_at' => optional($correction->created_at)->toIso8601String(),
                    'href' => null,
                ];
            });

        TeacherWordCoaching::query()
            ->where('student_id', $user->id)
            ->where('review_status', TeacherWordCoaching::IMPROVED)
            ->latest('id')
            ->limit($limit)
            ->get()
            ->each(function (TeacherWordCoaching $coaching) use (&$events) {
                $surah = (int) $coaching->surah_number;
                $events[] = [
                    'id' => 'improvement-'.$coaching->id,
                    'type' => 'improvement',
                    'authority' => 'teacher',
                    'verified_mistake' => false,
                    'is_tajweed_assessment' => false,
                    'surah_number' => $surah,
                    'surah_name' => QuranMetadata::name($surah),
                    'ayah_start' => (int) $coaching->ayah_number,
                    'ayah_end' => (int) $coaching->ayah_number,
                    'outcome_key' => 'improvement',
                    'outcome_params' => [],
                    'occurred_at' => optional($coaching->updated_at)->toIso8601String(),
                    'href' => null,
                ];
            });

        StudentSelfAssessment::query()
            ->where('student_id', $user->id)
            ->latest('id')
            ->limit($limit)
            ->get()
            ->each(function (StudentSelfAssessment $row) use (&$events) {
                $surah = $row->surah_number ? (int) $row->surah_number : null;
                $events[] = [
                    'id' => 'reflection-'.$row->id,
                    'type' => 'self_assessment',
                    'authority' => 'student',
                    'verified_mistake' => false,
                    'is_tajweed_assessment' => false,
                    'surah_number' => $surah,
                    'surah_name' => $surah ? QuranMetadata::name($surah) : null,
                    'ayah_start' => $row->ayah_start ? (int) $row->ayah_start : null,
                    'ayah_end' => $row->ayah_end ? (int) $row->ayah_end : null,
                    'outcome_key' => 'self_assessment',
                    'outcome_params' => [
                        'feeling' => $row->feeling,
                        'help' => $row->help_request ? mb_substr((string) $row->help_request, 0, 140) : null,
                    ],
                    'occurred_at' => optional($row->created_at)->toIso8601String(),
                    'href' => null,
                ];
            });

        return $events;
    }
}
