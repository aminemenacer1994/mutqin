<?php

namespace App\Policies;

use App\Models\User;
use App\Models\UserLastPosition;

class UserLastPositionPolicy
{
    public function view(User $user, UserLastPosition $position): bool
    {
        return $user->id === $position->user_id;
    }

    public function update(User $user, UserLastPosition $position): bool
    {
        return $user->id === $position->user_id;
    }

    public function delete(User $user, UserLastPosition $position): bool
    {
        return $user->id === $position->user_id;
    }
}
