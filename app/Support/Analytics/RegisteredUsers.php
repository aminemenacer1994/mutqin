<?php

namespace App\Support\Analytics;

use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

/**
 * Non-deleted accounts. Soft-deleted rows stay out through the User scope.
 * This is the same population as the Users total on the admin dashboard.
 */
final class RegisteredUsers
{
    /**
     * @return Builder<User>
     */
    public static function query(): Builder
    {
        return User::query();
    }

    public static function count(): int
    {
        return (int) self::query()->count();
    }
}
