<?php

namespace App\Policies;

use App\Models\MemorisationAssessment;
use App\Models\User;

class MemorisationAssessmentPolicy
{
    public function view(User $user, MemorisationAssessment $assessment): bool
    {
        return (int) $user->id === (int) $assessment->user_id;
    }

    public function update(User $user, MemorisationAssessment $assessment): bool
    {
        return (int) $user->id === (int) $assessment->user_id;
    }

    public function delete(User $user, MemorisationAssessment $assessment): bool
    {
        return (int) $user->id === (int) $assessment->user_id;
    }
}
