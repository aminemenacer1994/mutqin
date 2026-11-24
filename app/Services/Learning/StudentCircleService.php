<?php

namespace App\Services\Learning;

use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Enums\OrganisationType;
use App\Enums\ParentLinkStatus;
use App\Enums\RevisionRecommendationStatus;
use App\Models\GroupMembership;
use App\Models\ParentStudentLink;
use App\Models\RevisionRecommendation;
use App\Models\TeacherAssignment;
use App\Models\User;
use App\Services\Organisations\StudentAccessAuthorizer;
use App\Services\Teacher\LearningPlanService;
use App\Support\QuranMetadata;

/**
 * The student's current teachers, learning areas, guardians, plans and
 * published revision targets. Reassigned teachers and revoked guardian
 * links drop out. Parent account details and unpublished teacher notes stay out.
 */
final class StudentCircleService
{
    public function __construct(
        private readonly StudentAccessAuthorizer $access,
        private readonly StudentMessagingPolicy $messaging,
        private readonly LearningPlanService $plans,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function present(User $student): array
    {
        $teachers = $this->teachers($student);
        $plans = $this->plans->plansForLearner($student);

        return [
            'teachers' => $teachers,
            'guardians' => $this->guardians($student),
            'pending_guardians' => $this->pendingGuardians($student),
            'memberships' => $this->memberships($student),
            'learning_plans' => $plans,
            'revision_targets' => $this->revisionTargets($student),
            'messaging' => [
                'direct_allowed' => collect($teachers)->contains(fn (array $teacher) => (bool) $teacher['can_message']),
            ],
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function teachers(User $student): array
    {
        $studentMemberships = GroupMembership::query()
            ->where('user_id', $student->id)
            ->where('membership_role', MembershipRole::Student->value)
            ->where('status', MembershipStatus::Approved->value)
            ->with('learningGroup:id,name,organisation_id')
            ->get();

        $groupIds = $studentMemberships->pluck('learning_group_id')->map(fn ($id) => (int) $id)->unique()->values();
        if ($groupIds->isEmpty()) {
            return [];
        }

        $teacherMemberships = GroupMembership::query()
            ->whereIn('learning_group_id', $groupIds)
            ->where('membership_role', MembershipRole::Teacher->value)
            ->where('status', MembershipStatus::Approved->value)
            ->with('learningGroup:id,name,organisation_id')
            ->get()
            ->groupBy('user_id');

        $teacherIds = $teacherMemberships->keys()->map(fn ($id) => (int) $id)->all();
        $teachers = User::query()
            ->whereIn('id', $teacherIds)
            ->get(['id', 'name', 'account_role', 'organisation_id'])
            ->keyBy('id');

        $assignments = TeacherAssignment::query()
            ->whereIn('teacher_id', $teacherIds)
            ->whereHas('recipients', fn ($query) => $query->where('student_id', $student->id))
            ->get(['id', 'teacher_id', 'activity', 'hifz_category', 'learning_group_id']);

        $rows = [];
        foreach ($teacherMemberships as $teacherId => $memberships) {
            $teacher = $teachers->get((int) $teacherId);
            if (! $teacher instanceof User || ! $this->access->allows($teacher, $student)) {
                continue;
            }
            $decision = $this->messaging->decision($student, $teacher);
            $areas = [];
            foreach ($memberships as $membership) {
                $group = $membership->learningGroup;
                if ($group === null) {
                    continue;
                }
                $areas['group:'.$group->id] = [
                    'key' => 'group:'.$group->id,
                    'kind' => 'group',
                    'label' => (string) $group->name,
                ];
            }
            foreach ($assignments->where('teacher_id', (int) $teacher->id) as $assignment) {
                foreach ($this->assignmentAreas($assignment) as $area) {
                    $areas[$area['key']] = $area;
                }
            }

            $rows[] = [
                'id' => (int) $teacher->id,
                'name' => (string) $teacher->name,
                'learning_areas' => array_values($areas),
                'can_message' => $decision['allowed'],
                'messaging_reason' => $decision['reason'],
            ];
        }

        usort($rows, fn (array $a, array $b) => strcasecmp((string) $a['name'], (string) $b['name']));

        return $rows;
    }

    /**
     * @return list<array{key: string, kind: string, label: string}>
     */
    private function assignmentAreas(TeacherAssignment $assignment): array
    {
        $areas = [];
        $activity = (string) ($assignment->activity ?? '');
        $activityLabel = $this->activityLabel($activity);
        if ($activityLabel !== null) {
            $areas[] = [
                'key' => 'activity:'.$activity,
                'kind' => 'activity',
                'label' => $activityLabel,
            ];
        }
        $category = (string) ($assignment->hifz_category ?? '');
        $categoryLabel = $this->categoryLabel($category);
        if ($categoryLabel !== null) {
            $areas[] = [
                'key' => 'category:'.$category,
                'kind' => 'category',
                'label' => $categoryLabel,
            ];
        }

        return $areas;
    }

    /**
     * Approved guardians only. School classes see the relationship without a personal name.
     * Email and other account fields are never included.
     *
     * @return list<array<string, mixed>>
     */
    private function guardians(User $student): array
    {
        $student->loadMissing('organisation');
        $type = $student->organisation?->type;
        $value = $type instanceof OrganisationType ? $type->value : (string) $type;
        $hideName = $value === OrganisationType::School->value;

        return ParentStudentLink::query()
            ->where('student_user_id', $student->id)
            ->where('status', ParentLinkStatus::Approved->value)
            ->with('parent:id,name')
            ->orderBy('id')
            ->get()
            ->filter(fn (ParentStudentLink $link) => $link->parent instanceof User)
            ->map(function (ParentStudentLink $link) use ($hideName) {
                $relationship = trim((string) ($link->relationship ?? ''));

                return [
                    'id' => (int) $link->id,
                    'relationship' => $relationship !== '' ? $relationship : 'guardian',
                    'display_name' => $hideName ? null : $this->givenName((string) $link->parent->name),
                    'name_hidden' => $hideName,
                    'status' => 'connected',
                ];
            })
            ->values()
            ->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function pendingGuardians(User $student): array
    {
        return ParentStudentLink::query()
            ->where('student_user_id', $student->id)
            ->where('status', ParentLinkStatus::Pending->value)
            ->with('parent:id,name')
            ->orderBy('id')
            ->get()
            ->filter(fn (ParentStudentLink $link) => $link->parent instanceof User)
            ->map(function (ParentStudentLink $link) {
                $relationship = trim((string) ($link->relationship ?? ''));

                return [
                    'id' => (int) $link->id,
                    'relationship' => $relationship !== '' ? $relationship : 'guardian',
                    'display_name' => $this->givenName((string) $link->parent->name),
                    'status' => ParentLinkStatus::Pending->value,
                ];
            })
            ->values()
            ->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function memberships(User $student): array
    {
        return GroupMembership::query()
            ->where('user_id', $student->id)
            ->where('membership_role', MembershipRole::Student->value)
            ->with('learningGroup:id,name,organisation_id')
            ->orderByDesc('id')
            ->get()
            ->map(fn (GroupMembership $membership) => [
                'id' => (int) $membership->id,
                'status' => $membership->status?->value ?? (string) $membership->status,
                'consent' => $membership->analytics_consent_status?->value
                    ?? (string) $membership->analytics_consent_status,
                'group' => $membership->learningGroup?->only(['id', 'name', 'organisation_id']),
            ])
            ->values()
            ->all();
    }

    /**
     * Published revision targets only. Pending teacher recommendations stay private.
     *
     * @return list<array<string, mixed>>
     */
    private function revisionTargets(User $student): array
    {
        return RevisionRecommendation::query()
            ->where('student_id', $student->id)
            ->where('status', RevisionRecommendationStatus::Assigned->value)
            ->with('teacher:id,name,account_role,organisation_id')
            ->latest('id')
            ->limit(12)
            ->get()
            ->filter(function (RevisionRecommendation $row) use ($student) {
                $teacher = $row->teacher;

                return $teacher instanceof User && $this->access->allows($teacher, $student);
            })
            ->map(function (RevisionRecommendation $row) {
                $surah = (int) $row->surah_number;
                $from = (int) $row->ayah_start;
                $to = (int) $row->ayah_end;

                return [
                    'id' => (int) $row->id,
                    'teacher_name' => $row->teacher?->name,
                    'label' => QuranMetadata::name($surah).' · '.$from.($to !== $from ? '–'.$to : ''),
                    'activity' => $row->activity,
                    'instructions' => $row->instructions,
                    'due_on' => $row->due_on?->toDateString(),
                    'practice_href' => route('memorisation', array_filter([
                        'surah' => $surah,
                        'from' => $from,
                        'to' => $to,
                        'review' => 1,
                    ])),
                ];
            })
            ->values()
            ->all();
    }

    private function givenName(string $name): string
    {
        $name = trim($name);
        if ($name === '') {
            return 'Guardian';
        }
        $parts = preg_split('/\s+/', $name) ?: [];

        return $parts[0] !== '' ? $parts[0] : 'Guardian';
    }

    private function activityLabel(string $activity): ?string
    {
        return match ($activity) {
            'nazra' => 'Nazra',
            'hifz' => 'Hifz',
            'tajweed' => 'Tajweed',
            'revision' => 'Revision',
            default => null,
        };
    }

    private function categoryLabel(string $category): ?string
    {
        return match ($category) {
            'sabaq' => 'New memorisation',
            'sabqi' => 'Recent revision',
            'manzil' => 'Older revision',
            default => null,
        };
    }
}
