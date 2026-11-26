<?php

namespace App\Models;

use App\Enums\StudentImportRowStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StudentImportRow extends Model
{
    protected $fillable = [
        'student_import_batch_id',
        'student_import_file_id',
        'row_index',
        'status',
        'normalized',
        'errors',
        'source',
        'matched_user_id',
    ];

    protected function casts(): array
    {
        return [
            'status' => StudentImportRowStatus::class,
            'normalized' => 'array',
            'errors' => 'array',
            'source' => 'array',
        ];
    }

    public function batch(): BelongsTo
    {
        return $this->belongsTo(StudentImportBatch::class, 'student_import_batch_id');
    }

    public function file(): BelongsTo
    {
        return $this->belongsTo(StudentImportFile::class, 'student_import_file_id');
    }

    public function matchedUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'matched_user_id');
    }
}