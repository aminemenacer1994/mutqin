<?php

namespace App\Models;

use App\Enums\ParentGuardianPermission;
use App\Enums\ParentLinkStatus;
use Database\Factories\ParentStudentLinkFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ParentStudentLink extends Model
{
    /** @use HasFactory<ParentStudentLinkFactory> */
    use HasFactory;

    protected $fillable = [
        'parent_user_id',
        'student_user_id',
        'status',
        'relationship',
        'permissions',
        'requested_by_user_id',
        'decided_by_user_id',
        'decided_at',
        'approved_at',
        'revoked_by_user_id',
        'revoked_at',
        'revoked_reason',
    ];

    protected function casts(): array
    {
        return [
            'status' => ParentLinkStatus::class,
            'permissions' => 'array',
            'decided_at' => 'datetime',
            'approved_at' => 'datetime',
            'revoked_at' => 'datetime',
        ];
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(User::class, 'parent_user_id');
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_user_id');
    }

    public function requestedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by_user_id');
    }

    public function decidedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'decided_by_user_id');
    }

    public function revokedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'revoked_by_user_id');
    }

    public function events(): HasMany
    {
        return $this->hasMany(ParentStudentLinkEvent::class);
    }

    public function isApproved(): bool
    {
        return $this->status === ParentLinkStatus::Approved;
    }

    public function allowsPermission(string $permission): bool
    {
        $permissions = $this->permissions;
        if (! is_array($permissions) || $permissions === []) {
            return in_array($permission, ParentGuardianPermission::defaultGranted(), true);
        }

        return in_array($permission, $permissions, true);
    }

    /**
     * @return list<string>
     */
    public function effectivePermissions(): array
    {
        $permissions = $this->permissions;

        return is_array($permissions) && $permissions !== []
            ? array_values($permissions)
            : ParentGuardianPermission::defaultGranted();
    }
}
