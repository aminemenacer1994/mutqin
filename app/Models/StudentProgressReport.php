<?php

namespace App\Models;

use App\Enums\StudentProgressReportStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StudentProgressReport extends Model
{
    protected $fillable = [
        'student_user_id',
        'teacher_user_id',
        'period_type',
        'period_start',
        'period_end',
        'status',
        'teacher_notes',
        'payload',
        'payload_version',
        'generated_at',
        'approved_at',
        'approved_by_user_id',
        'shared_with_parents',
    ];

    protected function casts(): array
    {
        return [
            'period_start' => 'date',
            'period_end' => 'date',
            'status' => StudentProgressReportStatus::class,
            'payload' => 'array',
            'generated_at' => 'datetime',
            'approved_at' => 'datetime',
            'shared_with_parents' => 'boolean',
        ];
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_user_id');
    }

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'teacher_user_id');
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by_user_id');
    }

    public function isApproved(): bool
    {
        return $this->status === StudentProgressReportStatus::Approved;
    }

    public function isDraft(): bool
    {
        return $this->status === StudentProgressReportStatus::Draft;
    }
}