<?php

namespace App\Services\Demo;

use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Enums\ParentLinkStatus;
use App\Enums\TeacherNoteKind;
use App\Models\GroupMembership;
use App\Models\ParentLearningReport;
use App\Models\ParentStudentLink;
use App\Models\TeacherNote;
use App\Models\User;
use App\Services\Organisations\TeacherAnchorStudentEnroller;
use App\Services\Parent\ParentLearningReportGenerator;
use App\Services\Parent\ParentLearningReportPeriods;
use App\Support\ParentFeatures;
use App\Support\Demo\AnchorStudentDemoCatalog;
use App\Support\Demo\DemoStudentVolume;
use App\Support\Demo\OrganisationNetworkClassroom;
use Illuminate\Support\Carbon;

/**
 * Classroom assignments, progress, and parent-facing extras for anchor students.
 */
final class AnchorStudentLearningPlanter
{
    public function __construct(
        private readonly TeacherAnchorStudentEnroller $enroller,
        private readonly OrganisationNetworkClassroom $classroom,
        private readonly ParentLearningReportGenerator $reportGenerator,
    ) {}

    /**
     * @return list<string> planted student emails
     */
    public function plantAll(): array
    {
        $planted = [];
        foreach ($this->enroller->emails() as $email) {
            if ($this->plantForEmail($email)) {
                $planted[] = $email;
            }
        }

        return $planted;
    }

    public function plantForEmail(string $email): bool
    {
        $student = User::query()->whereRaw('LOWER(email) = ?', [strtolower(trim($email))])->first();
        if (! $student instanceof User) {
            return false;
        }

        $teacher = $this->resolvePrimaryTeacher($student);
        if (! $teacher instanceof User) {
            return false;
        }

        $this->classroom->purgeActivity([(int) $student->id]);
        ParentLearningReport::query()->where('student_user_id', $student->id)->delete();

        $definition = AnchorStudentDemoCatalog::definition($student);
        $this->classroom->plantStudent($student, $teacher, $definition);
        $this->seedParentExtras($student, $teacher);
        $this->ensureReports($student);

        return true;
    }

    public function plantForStudent(User $student): bool
    {
        return $this->plantForEmail((string) $student->email);
    }

    private function resolvePrimaryTeacher(User $student): ?User
    {
        $studentMembership = GroupMembership::query()
            ->where('user_id', $student->id)
            ->where('membership_role', MembershipRole::Student)
            ->where('status', MembershipStatus::Approved)
            ->orderBy('id')
            ->first();

        if ($studentMembership === null) {
            return null;
        }

        $teacherMembership = GroupMembership::query()
            ->with('user')
            ->where('learning_group_id', $studentMembership->learning_group_id)
            ->where('membership_role', MembershipRole::Teacher)
            ->where('status', MembershipStatus::Approved)
            ->orderBy('id')
            ->first();

        return $teacherMembership?->user;
    }

    private function seedParentExtras(User $student, User $teacher): void
    {
        $links = ParentStudentLink::query()
            ->with('parent')
            ->where('student_user_id', $student->id)
            ->where('status', ParentLinkStatus::Approved)
            ->get();

        foreach ($links as $link) {
            $parent = $link->parent;
            if (! $parent instanceof User) {
                continue;
            }

            $this->seedParentConversation($student, $teacher, $parent);
        }
    }

    private function ensureReports(User $student): void
    {
        if (! ParentFeatures::enabled()) {
            return;
        }

        $periods = app(ParentLearningReportPeriods::class);
        $anchor = now()->utc();
        $weekStart = $periods->closed('week', $anchor)[0];
        $monthStart = $periods->closed('month', $anchor)[0];

        for ($index = 0; $index < DemoStudentVolume::MIN_LIST_ITEMS; $index++) {
            $this->reportGenerator->generate((int) $student->id, 'week', $weekStart);
            $this->reportGenerator->generate((int) $student->id, 'month', $monthStart);

            [$weekStart] = $periods->previous('week', $weekStart);
            [$monthStart] = $periods->previous('month', $monthStart);
        }
    }

    private function seedParentConversation(User $student, User $teacher, User $parent): void
    {
        $exists = TeacherNote::query()
            ->where('student_id', $student->id)
            ->where('parent_user_id', $parent->id)
            ->exists();

        if ($exists) {
            return;
        }

        $organisationId = $teacher->organisation_id;
        $at = now()->subDays(3)->setTime(19, 30);

        $parentNote = new TeacherNote;
        $parentNote->forceFill([
            'teacher_id' => $teacher->id,
            'student_id' => $student->id,
            'parent_user_id' => $parent->id,
            'organisation_id' => $organisationId,
            'kind' => TeacherNoteKind::ParentMessage,
            'body' => 'Salaam — how is '.$student->name.' doing on this week’s assigned range?',
            'created_at' => $at,
            'updated_at' => $at,
        ])->save();

        $teacherNote = new TeacherNote;
        $teacherNote->forceFill([
            'teacher_id' => $teacher->id,
            'student_id' => $student->id,
            'parent_user_id' => $parent->id,
            'organisation_id' => $organisationId,
            'kind' => TeacherNoteKind::TeacherMessage,
            'body' => 'Progress looks steady. One calm repetition at home after maghrib would help this week.',
            'read_at' => $at->copy()->addHours(4),
            'created_at' => $at->copy()->addHours(3),
            'updated_at' => $at->copy()->addHours(4),
        ])->save();
    }
}