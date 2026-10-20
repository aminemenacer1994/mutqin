<?php

namespace App\Models;

use Database\Factories\LearningGroupFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LearningGroup extends Model
{
    /** @use HasFactory<LearningGroupFactory> */
    use HasFactory;

    protected $guarded = ['*'];

    public function organisation(): BelongsTo
    {
        return $this->belongsTo(Organisation::class);
    }

    public function memberships(): HasMany
    {
        return $this->hasMany(GroupMembership::class);
    }
}
