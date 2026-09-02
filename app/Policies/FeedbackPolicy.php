<?php

namespace App\Policies;

use App\Models\Feedback;
use App\Models\User;

class FeedbackPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isAdmin();
    }

    public function view(User $user, Feedback $feedback): bool
    {
        return $user->isAdmin() || (int) $user->id === (int) $feedback->user_id;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, Feedback $feedback): bool
    {
        return $user->isAdmin();
    }
}
