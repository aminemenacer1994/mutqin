<?php

namespace App\Policies;

use App\Models\MemorisationAttemptComparison;
use App\Models\User;

class MemorisationAttemptComparisonPolicy
{
    public function view(User $user, MemorisationAttemptComparison $comparison): bool
    {
        return $user->isAdmin() || (int) $user->id === (int) $comparison->user_id;
    }

    public function update(User $user, MemorisationAttemptComparison $comparison): bool
    {
        return $user->isAdmin();
    }

    public function delete(User $user, MemorisationAttemptComparison $comparison): bool
    {
        return $user->isAdmin();
    }
}
