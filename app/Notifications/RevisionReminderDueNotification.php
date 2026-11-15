<?php

namespace App\Notifications;

use App\Models\RevisionReminder;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class RevisionReminderDueNotification extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * @param  array<string, mixed>  $payload
     */
    public function __construct(
        public readonly RevisionReminder $reminder,
        public readonly array $payload = [],
    ) {}

    /**
     * @return list<string>
     */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'revision_reminder_due',
            'revision_reminder_id' => (int) $this->reminder->id,
            'surah_number' => (int) ($this->payload['surah_number'] ?? $this->reminder->surah_number),
            'surah_name' => $this->payload['surah_name'] ?? null,
            'ayah_start' => (int) ($this->payload['ayah_start'] ?? $this->reminder->ayah_start),
            'ayah_end' => (int) ($this->payload['ayah_end'] ?? $this->reminder->ayah_end),
            'due_at' => $this->payload['due_at'] ?? $this->reminder->due_at?->toIso8601String(),
            'priority' => $this->payload['priority'] ?? null,
            'bucket' => $this->payload['bucket'] ?? null,
            'href' => $this->payload['href'] ?? null,
            'status' => $this->payload['status'] ?? null,
        ];
    }
}
