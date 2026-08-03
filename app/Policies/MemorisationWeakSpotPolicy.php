<?php

namespace App\Policies;

use App\Models\MemorisationWeakSpot;
use App\Models\User;

class MemorisationWeakSpotPolicy
{
    public function view(User $user, MemorisationWeakSpot $weakSpot): bool
    {
        return $user->isAdmin() || (int) $user->id === (int) $weakSpot->user_id;
    }

    public function update(User $user, MemorisationWeakSpot $weakSpot): bool
    {
        return $user->isAdmin();
    }

    public function delete(User $user, MemorisationWeakSpot $weakSpot): bool
    {
        return $user->isAdmin();
    }
}
