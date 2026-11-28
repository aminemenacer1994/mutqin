<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ParentHomeworkSupervision extends Model
{
    protected $guarded = ['*'];

    protected function casts(): array
    {
        return [
            'acknowledged_at' => 'datetime',
        ];
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(User::class, 'parent_user_id');
    }

    public function recipient(): BelongsTo
    {
        return $this->belongsTo(TeacherAssignmentRecipient::class, 'teacher_assignment_recipient_id');
    }
}