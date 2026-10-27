<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WaitingListEntry extends Model
{
    protected $fillable = [
        'name',
        'email',
        'attribution',
        'first_source',
        'last_source',
        'last_campaign',
        'unsubscribed_at',
        'bounced_at',
        'marked_invalid_at',
    ];

    protected $casts = [
        'attribution' => 'array',
        'unsubscribed_at' => 'datetime',
        'bounced_at' => 'datetime',
        'marked_invalid_at' => 'datetime',
    ];

    public function getConnectionName(): ?string
    {
        $connection = config('mutqin.waiting_list.database_connection');

        if (is_string($connection) && $connection !== '') {
            return $connection;
        }

        return parent::getConnectionName();
    }
}
