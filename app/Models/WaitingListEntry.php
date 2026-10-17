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
    ];

    protected $casts = ['attribution' => 'array'];

    public function getConnectionName(): ?string
    {
        $connection = config('mutqin.waiting_list.database_connection');

        if (is_string($connection) && $connection !== '') {
            return $connection;
        }

        return parent::getConnectionName();
    }
}
