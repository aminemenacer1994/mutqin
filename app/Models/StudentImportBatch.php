<?php

namespace App\Models;

use App\Enums\StudentImportBatchStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class StudentImportBatch extends Model
{
    protected $fillable = [
        'organisation_id',
        'learning_group_id',
        'initiated_by_user_id',
        'status',
        'progress_percent',
        'rows_total',
        'rows_valid',
        'rows_invalid',
        'rows_imported',
        'error_summary',
        'metadata',
        'processing_started_at',
        'ready_at',
        'importing_started_at',
        'completed_at',
        'failed_at',
        'expires_at',
    ];

    protected function casts(): array
    {
        return [
            'status' => StudentImportBatchStatus::class,
            'metadata' => 'array',
            'processing_started_at' => 'datetime',
            'ready_at' => 'datetime',
            'importing_started_at' => 'datetime',
            'completed_at' => 'datetime',
            'failed_at' => 'datetime',
            'expires_at' => 'datetime',
        ];
    }

    public function organisation(): BelongsTo
    {
        return $this->belongsTo(Organisation::class);
    }

    public function learningGroup(): BelongsTo
    {
        return $this->belongsTo(LearningGroup::class);
    }

    public function initiatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'initiated_by_user_id');
    }

    public function files(): HasMany
    {
        return $this->hasMany(StudentImportFile::class);
    }

    public function rows(): HasMany
    {
        return $this->hasMany(StudentImportRow::class);
    }
}