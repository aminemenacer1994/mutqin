<?php

namespace App\Notifications;

use Illuminate\Notifications\Notification;

class LearningTaskNotification extends Notification
{
    /**
     * @param  array<string, mixed>  $payload
     */
    public function __construct(
        public readonly string $sourceKey,
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
            'type' => (string) ($this->payload['type'] ?? 'learning_task'),
            'source_key' => $this->sourceKey,
            'title' => $this->payload['title'] ?? null,
            'body' => $this->payload['body'] ?? null,
            'href' => $this->payload['href'] ?? null,
            'surah_number' => $this->payload['surah_number'] ?? null,
            'ayah_start' => $this->payload['ayah_start'] ?? null,
            'ayah_end' => $this->payload['ayah_end'] ?? null,
            'due_on' => $this->payload['due_on'] ?? null,
            'teacher_note_id' => $this->payload['teacher_note_id'] ?? null,
            'teacher_lesson_id' => $this->payload['teacher_lesson_id'] ?? null,
            'teacher_assignment_recipient_id' => $this->payload['teacher_assignment_recipient_id'] ?? null,
            'child_user_id' => isset($this->payload['child_user_id']) ? (int) $this->payload['child_user_id'] : null,
        ];
    }
}
