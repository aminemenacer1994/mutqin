<?php

namespace App\Policies;

use App\Models\MemorisationPracticePlan;
use App\Models\User;

class MemorisationPracticePlanPolicy
{
    public function view(User $user, MemorisationPracticePlan $practicePlan): bool
    {
        return $user->isAdmin() || (int) $user->id === (int) $practicePlan->user_id;
    }

    public function update(User $user, MemorisationPracticePlan $practicePlan): bool
    {
        return $user->isAdmin() || (int) $user->id === (int) $practicePlan->user_id;
    }

    public function delete(User $user, MemorisationPracticePlan $practicePlan): bool
    {
        return $user->isAdmin() || (int) $user->id === (int) $practicePlan->user_id;
    }
}
