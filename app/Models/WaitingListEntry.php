<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WaitingListEntry extends Model
{
    protected $fillable = [
        'name',
        'email',
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
