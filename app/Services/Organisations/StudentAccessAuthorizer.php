<?php

namespace App\Services\Organisations;

use App\Enums\AccountRole;
use App\Enums\AnalyticsConsentStatus;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Models\GroupMembership;
use App\Models\User;
use App\Support\TeacherFeatures;
use Illuminate\Support\Collection;

/**
 * Teacher access requires an approved shared group and the student's own consent.
 * A shared organisation id is never enough.
 */
class StudentAccessAuthorizer
{
    public function allows(User $actor, User $student): bool
    {
        if (! TeacherFeatures::enabled()) {
            return false;
        }

        if ($actor->trashed() || $student->trashed()) {
            return false;
        }

        if ((int) $actor->id === (int) $student->id) {
            return false;
        }

        if ($actor->account_role !== AccountRole::Teacher || $student->account_role !== AccountRole::Student) {
            return false;
        }

        if ($actor->organisation_id === null) {
            return false;
        }

        return $this->authorizedStudentIds($actor)->contains((int) $student->id);
    }

    /**
     * @return Collection<int, int>
     */
    public function teacherGroupIds(User $actor): Collection
    {
        if (! TeacherFeatures::enabled()) {
            return collect();
        }

        if ($actor->trashed() || $actor->account_role !== AccountRole::Teacher || $actor->organisation_id === null) {
            return collect();
        }

        return GroupMembership::query()
            ->where('user_id', $actor->id)
            ->where('membership_role', MembershipRole::Teacher->value)
            ->where('status', MembershipStatus::Approved->value)
            ->whereHas('learningGroup', function ($query) use ($actor) {
                $query->where('organisation_id', $actor->organisation_id);
            })
            ->pluck('learning_group_id')
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values();
    }

    /**
     * Students this teacher may see. Organisation matching alone never qualifies.
     *
     * @return Collection<int, int>
     */
    public function authorizedStudentIds(User $actor): Collection
    {
        $groupIds = $this->teacherGroupIds($actor);
        if ($groupIds->isEmpty()) {
            return collect();
        }

        return GroupMembership::query()
            ->whereIn('learning_group_id', $groupIds)
            ->where('membership_role', MembershipRole::Student->value)
            ->where('status', MembershipStatus::Approved->value)
            ->where('analytics_consent_status', AnalyticsConsentStatus::Granted->value)
            ->where('analytics_consent_version', GroupMembership::ANALYTICS_CONSENT_VERSION)
            ->whereColumn('analytics_consent_user_id', 'user_id')
            ->where('user_id', '!=', $actor->id)
            ->whereHas('learningGroup', function ($query) use ($actor) {
                $query->where('organisation_id', $actor->organisation_id);
            })
            ->whereHas('user', function ($query) {
                $query->where('account_role', AccountRole::Student->value);
            })
            ->pluck('user_id')
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values();
    }
}
