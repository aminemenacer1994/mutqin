<?php

namespace App\Models;

use App\Enums\LearningGroupInvitationStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LearningGroupInvitation extends Model
{
    protected $fillable = [
        'learning_group_id',
        'invited_by_user_id',
        'invited_email',
        'token_hash',
        'code_hash',
        'status',
        'expires_at',
        'accepted_at',
        'accepted_by_user_id',
        'group_membership_id',
        'revoked_at',
        'revoked_by_user_id',
    ];

    protected function casts(): array
    {
        return [
            'status' => LearningGroupInvitationStatus::class,
            'expires_at' => 'datetime',
            'accepted_at' => 'datetime',
            'revoked_at' => 'datetime',
        ];
    }

    public function learningGroup(): BelongsTo
    {
        return $this->belongsTo(LearningGroup::class);
    }

    public function invitedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'invited_by_user_id');
    }

    public function acceptedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'accepted_by_user_id');
    }

    public function membership(): BelongsTo
    {
        return $this->belongsTo(GroupMembership::class, 'group_membership_id');
    }

    public function isOpen(): bool
    {
        return $this->status === LearningGroupInvitationStatus::Pending
            && $this->expires_at !== null
            && $this->expires_at->isFuture();
    }
}
