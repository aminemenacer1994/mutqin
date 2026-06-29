<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MemorisationProgress extends Model
{
    protected $table = 'memorisation_progress';

    protected $fillable = [
        'user_id',
        'surah_number',
        'ayah_number',
        'status',
        'mastery_level',
        'repetitions',
        'metadata',
        'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'surah_number' => 'integer',
            'ayah_number' => 'integer',
            'mastery_level' => 'integer',
            'repetitions' => 'integer',
            'metadata' => 'array',
            'completed_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
