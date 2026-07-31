<?php

namespace App\Policies;

use App\Models\AyahNote;
use App\Models\User;

class AyahNotePolicy
{
    public function view(User $user, AyahNote $ayahNote): bool
    {
        return $user->id === $ayahNote->user_id;
    }

    public function update(User $user, AyahNote $ayahNote): bool
    {
        return $user->id === $ayahNote->user_id;
    }

    public function delete(User $user, AyahNote $ayahNote): bool
    {
        return $user->id === $ayahNote->user_id;
    }
}
