<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TeacherLesson extends Model
{
    protected $guarded = ['*'];

    protected function casts(): array
    {
        return ['lesson_date' => 'date'];
    }

    public function learningGroup(): BelongsTo
    {
        return $this->belongsTo(LearningGroup::class);
    }

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }
}
