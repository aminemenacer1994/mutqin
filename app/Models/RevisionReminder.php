<?php

namespace App\Models;

use App\Enums\RevisionReminderPriority;
use App\Enums\RevisionReminderSource;
use App\Enums\RevisionReminderStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RevisionReminder extends Model
{
    protected $guarded = ['*'];

    protected function casts(): array
    {
        return [
            'source_type' => RevisionReminderSource::class,
            'priority' => RevisionReminderPriority::class,
            'status' => RevisionReminderStatus::class,
            'surah_number' => 'integer',
            'ayah_start' => 'integer',
            'ayah_end' => 'integer',
            'due_at' => 'datetime',
            'snoozed_until' => 'datetime',
            'notified_in_app_at' => 'datetime',
            'emailed_at' => 'datetime',
            'completed_at' => 'datetime',
            'session_settings' => 'array',
            'zone_step' => 'integer',
            'interval_days' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function assignmentRecipient(): BelongsTo
    {
        return $this->belongsTo(TeacherAssignmentRecipient::class, 'teacher_assignment_recipient_id');
    }

    public function practicePlan(): BelongsTo
    {
        return $this->belongsTo(MemorisationPracticePlan::class, 'memorisation_practice_plan_id');
    }

    public function isOpen(): bool
    {
        $status = $this->status instanceof RevisionReminderStatus
            ? $this->status
            : RevisionReminderStatus::tryFrom((string) $this->status);

        return $status !== null && in_array($status->value, RevisionReminderStatus::openValues(), true);
    }
}
