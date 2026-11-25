<?php

namespace App\Models;

use App\Enums\OrganisationTeacherInvitationStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrganisationTeacherInvitation extends Model
{
    protected $fillable = [
        'organisation_id',
        'invited_email',
        'invited_by_user_id',
        'token_hash',
        'status',
        'expires_at',
        'sent_at',
        'accepted_at',
        'accepted_by_user_id',
        'organisation_membership_id',
        'revoked_at',
        'revoked_by_user_id',
    ];

    protected function casts(): array
    {
        return [
            'status' => OrganisationTeacherInvitationStatus::class,
            'expires_at' => 'datetime',
            'sent_at' => 'datetime',
            'accepted_at' => 'datetime',
            'revoked_at' => 'datetime',
        ];
    }

    public function organisation(): BelongsTo
    {
        return $this->belongsTo(Organisation::class);
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
        return $this->belongsTo(OrganisationMembership::class, 'organisation_membership_id');
    }

    public function isOpen(): bool
    {
        return $this->status === OrganisationTeacherInvitationStatus::Pending
            && $this->expires_at !== null
            && $this->expires_at->isFuture();
    }
}