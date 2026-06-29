<?php

namespace App\Policies;

use App\Models\LearningAnalytic;
use App\Models\User;

class LearningAnalyticPolicy
{
    public function view(User $user, LearningAnalytic $analytic): bool
    {
        return $user->id === $analytic->user_id;
    }

    public function update(User $user, LearningAnalytic $analytic): bool
    {
        return $user->id === $analytic->user_id;
    }

    public function delete(User $user, LearningAnalytic $analytic): bool
    {
        return $user->id === $analytic->user_id;
    }
}
