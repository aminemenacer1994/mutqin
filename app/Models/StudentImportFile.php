<?php

namespace App\Models;

use App\Enums\StudentImportFileStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class StudentImportFile extends Model
{
    protected $fillable = [
        'student_import_batch_id',
        'original_filename',
        'stored_path',
        'mime_type',
        'extension',
        'size_bytes',
        'sha256',
        'status',
        'parser_key',
        'error_message',
        'provenance',
    ];

    protected function casts(): array
    {
        return [
            'status' => StudentImportFileStatus::class,
            'provenance' => 'array',
        ];
    }

    public function batch(): BelongsTo
    {
        return $this->belongsTo(StudentImportBatch::class, 'student_import_batch_id');
    }

    public function rows(): HasMany
    {
        return $this->hasMany(StudentImportRow::class);
    }
}