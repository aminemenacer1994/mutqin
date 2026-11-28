<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class MushafAnnotation extends Model
{
    use SoftDeletes;

    protected $guarded = ['*'];

    protected function casts(): array
    {
        return [
            'surah_number' => 'integer',
            'ayah_number' => 'integer',
            'word_index' => 'integer',
            'audio_bytes' => 'integer',
            'audio_duration_ms' => 'integer',
            'start_ms' => 'integer',
            'end_ms' => 'integer',
            'is_published' => 'boolean',
            'is_draft' => 'boolean',
        ];
    }

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_id');
    }
}