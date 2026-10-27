<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WaitingListEmailDelivery extends Model
{
    public const STATUS_PENDING = 'pending';

    public const STATUS_SENT = 'sent';

    public const STATUS_FAILED = 'failed';

    public const STATUS_SKIPPED = 'skipped';

    protected $fillable = [
        'campaign_key',
        'email_hash',
        'waiting_list_entry_id',
        'status',
        'skip_reason',
        'attempts',
        'last_error',
        'sent_at',
    ];

    protected $casts = [
        'sent_at' => 'datetime',
    ];

    public function getConnectionName(): ?string
    {
        $connection = config('mutqin.waiting_list.database_connection');

        if (is_string($connection) && $connection !== '') {
            return $connection;
        }

        return parent::getConnectionName();
    }

    public function entry(): BelongsTo
    {
        return $this->belongsTo(WaitingListEntry::class, 'waiting_list_entry_id');
    }
}
