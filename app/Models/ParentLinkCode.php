<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ParentLinkCode extends Model
{
    protected $fillable = [
        'parent_user_id',
        'code_hash',
        'expires_at',
        'used_at',
        'student_user_id',
        'parent_student_link_id',
    ];

    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'used_at' => 'datetime',
        ];
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(User::class, 'parent_user_id');
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_user_id');
    }

    public function link(): BelongsTo
    {
        return $this->belongsTo(ParentStudentLink::class, 'parent_student_link_id');
    }
}
