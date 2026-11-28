<?php

namespace App\Models;

use App\Enums\TeacherAssignmentAudioRole;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TeacherAssignmentAudioAsset extends Model
{
    protected $guarded = ['*'];

    protected function casts(): array
    {
        return [
            'role' => TeacherAssignmentAudioRole::class,
            'audio_bytes' => 'integer',
            'audio_duration_ms' => 'integer',
        ];
    }

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    public function organisation(): BelongsTo
    {
        return $this->belongsTo(Organisation::class);
    }
}