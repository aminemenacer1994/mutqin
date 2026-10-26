<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TeacherRecitationAssessment extends Model
{
    protected $guarded = ['*'];

    protected function casts(): array
    {
        return ['tajweed_score' => 'integer'];
    }
}
