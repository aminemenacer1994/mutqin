<?php

namespace App\Models;

use App\Enums\ParentInvitationStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ParentInvitation extends Model
{
    protected $fillable = [
        'student_user_id',
        'invited_email',
        'relationship',
        'invited_by_user_id',
        'token_hash',
        'status',
        'expires_at',
        'sent_at',
        'accepted_at',
        'accepted_by_user_id',
        'rejected_at',
        'revoked_at',
        'revoked_by_user_id',
        'parent_student_link_id',
    ];

    protected function casts(): array
    {
        return [
            'status' => ParentInvitationStatus::class,
            'expires_at' => 'datetime',
            'sent_at' => 'datetime',
            'accepted_at' => 'datetime',
            'rejected_at' => 'datetime',
            'revoked_at' => 'datetime',
        ];
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_user_id');
    }

    public function invitedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'invited_by_user_id');
    }

    public function acceptedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'accepted_by_user_id');
    }

    public function revokedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'revoked_by_user_id');
    }

    public function link(): BelongsTo
    {
        return $this->belongsTo(ParentStudentLink::class, 'parent_student_link_id');
    }

    public function events(): HasMany
    {
        return $this->hasMany(ParentInvitationEvent::class);
    }

    public function isOpen(): bool
    {
        return $this->status === ParentInvitationStatus::Pending
            && $this->expires_at !== null
            && $this->expires_at->isFuture();
    }
}
