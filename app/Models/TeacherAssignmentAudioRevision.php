<?php

namespace App\Models;

use App\Enums\TeacherAssignmentAudioRole;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TeacherAssignmentAudioRevision extends Model
{
    protected $guarded = ['*'];

    protected function casts(): array
    {
        return [
            'role' => TeacherAssignmentAudioRole::class,
            'published_at' => 'datetime',
            'superseded_at' => 'datetime',
        ];
    }

    public function assignment(): BelongsTo
    {
        return $this->belongsTo(TeacherAssignment::class, 'teacher_assignment_id');
    }

    public function audioAsset(): BelongsTo
    {
        return $this->belongsTo(TeacherAssignmentAudioAsset::class, 'audio_asset_id');
    }
}