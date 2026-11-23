<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ParentLearningReport extends Model
{
    protected $fillable = [
        'student_user_id',
        'cadence',
        'period_start',
        'period_end',
        'generated_at',
        'payload',
    ];

    protected function casts(): array
    {
        return [
            'period_start' => 'date',
            'period_end' => 'date',
            'generated_at' => 'datetime',
            'payload' => 'array',
        ];
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_user_id');
    }
}
