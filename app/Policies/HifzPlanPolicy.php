<?php

namespace App\Policies;

use App\Models\HifzPlan;
use App\Models\User;

class HifzPlanPolicy
{
    public function view(User $user, HifzPlan $hifzPlan): bool
    {
        return $user->id === $hifzPlan->user_id;
    }

    public function update(User $user, HifzPlan $hifzPlan): bool
    {
        return $user->id === $hifzPlan->user_id;
    }

    public function delete(User $user, HifzPlan $hifzPlan): bool
    {
        return $user->id === $hifzPlan->user_id;
    }
}
