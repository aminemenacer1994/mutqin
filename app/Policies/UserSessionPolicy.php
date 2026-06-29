<?php

namespace App\Policies;

use App\Models\User;
use App\Models\UserSession;

class UserSessionPolicy
{
    public function view(User $user, UserSession $session): bool
    {
        return $user->id === $session->user_id;
    }

    public function update(User $user, UserSession $session): bool
    {
        return $user->id === $session->user_id;
    }

    public function delete(User $user, UserSession $session): bool
    {
        return $user->id === $session->user_id;
    }
}
