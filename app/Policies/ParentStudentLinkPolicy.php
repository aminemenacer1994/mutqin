<?php

namespace App\Policies;

use App\Enums\ParentLinkStatus;
use App\Models\ParentStudentLink;
use App\Models\User;
use App\Support\ParentFeatures;

class ParentStudentLinkPolicy
{
    public function view(User $user, ParentStudentLink $link): bool
    {
        if (! ParentFeatures::enabled()) {
            return false;
        }

        return (int) $user->id === (int) $link->parent_user_id
            || (int) $user->id === (int) $link->student_user_id;
    }

    public function approve(User $user, ParentStudentLink $link): bool
    {
        if (! ParentFeatures::enabled()) {
            return false;
        }

        return (int) $user->id === (int) $link->student_user_id
            && $link->status === ParentLinkStatus::Pending;
    }

    public function reject(User $user, ParentStudentLink $link): bool
    {
        return $this->approve($user, $link);
    }

    public function revoke(User $user, ParentStudentLink $link): bool
    {
        if (! ParentFeatures::enabled()) {
            return false;
        }

        if ($link->status !== ParentLinkStatus::Approved) {
            return false;
        }

        return (int) $user->id === (int) $link->parent_user_id
            || (int) $user->id === (int) $link->student_user_id;
    }

    public function updatePermissions(User $user, ParentStudentLink $link): bool
    {
        if (! ParentFeatures::enabled()) {
            return false;
        }

        return (int) $user->id === (int) $link->student_user_id
            && $link->status === ParentLinkStatus::Approved;
    }
}
