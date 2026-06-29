<?php

namespace App\Policies;

use App\Models\MemorisationProgress;
use App\Models\User;

class MemorisationProgressPolicy
{
    public function view(User $user, MemorisationProgress $progress): bool
    {
        return $user->id === $progress->user_id;
    }

    public function update(User $user, MemorisationProgress $progress): bool
    {
        return $user->id === $progress->user_id;
    }

    public function delete(User $user, MemorisationProgress $progress): bool
    {
        return $user->id === $progress->user_id;
    }
}
