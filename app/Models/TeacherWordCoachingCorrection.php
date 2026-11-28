<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class TeacherWordCoachingCorrection extends Model
{
    use SoftDeletes;

    protected $guarded = ['*'];

    protected function casts(): array
    {
        return [
            'audio_bytes' => 'integer',
            'audio_duration_ms' => 'integer',
        ];
    }

    public function coaching(): BelongsTo
    {
        return $this->belongsTo(TeacherWordCoaching::class, 'teacher_word_coaching_id');
    }

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }
}
