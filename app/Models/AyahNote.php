<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AyahNote extends Model
{
    protected $table = 'ayah_notes';

    protected $fillable = [
        'user_id',
        'surah_number',
        'ayah_number',
        'title',
        'body',
    ];

    protected function casts(): array
    {
        return [
            'surah_number' => 'integer',
            'ayah_number' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
