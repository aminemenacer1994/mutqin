<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PreviewSandboxSession extends Model
{
    use HasUuids;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'owner_user_id',
        'classroom_key',
        'catalog',
        'active_persona',
        'expires_at',
        'last_activity_at',
        'reset_at',
        'quotas',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'last_activity_at' => 'datetime',
            'reset_at' => 'datetime',
            'quotas' => 'array',
        ];
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_user_id');
    }

    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }

    public function touchActivity(): void
    {
        $ttl = max(15, (int) config('mutqin.preview_sandbox.session_ttl_minutes', 120));

        $this->forceFill([
            'last_activity_at' => now(),
            'expires_at' => now()->addMinutes($ttl),
        ])->save();
    }

    /**
     * @return array<string, int>
     */
    public function quotaUsage(): array
    {
        $usage = $this->quotas;

        return is_array($usage) ? $usage : [];
    }

    public function quotaCount(string $key): int
    {
        return (int) ($this->quotaUsage()[$key] ?? 0);
    }

    public function incrementQuota(string $key, int $amount = 1): void
    {
        $usage = $this->quotaUsage();
        $usage[$key] = ($usage[$key] ?? 0) + $amount;
        $this->forceFill(['quotas' => $usage])->save();
    }

    public function clearQuotas(): void
    {
        $this->forceFill(['quotas' => []])->save();
    }
}
