<?php

namespace App\Http\Controllers\Api\Learning;

use App\Http\Controllers\Controller;
use App\Models\RevisionReminder;
use App\Services\Achievements\PracticePreferences;
use App\Services\RevisionReminders\RevisionReminderQueryService;
use App\Services\RevisionReminders\RevisionReminderSyncService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RevisionReminderController extends Controller
{
    public function __construct(
        private readonly RevisionReminderQueryService $query,
        private readonly RevisionReminderSyncService $sync,
        private readonly PracticePreferences $preferences,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $payload = $this->query->forUser($request->user());

        return response()->json(['payload' => $payload]);
    }

    public function snooze(Request $request, RevisionReminder $revisionReminder): JsonResponse
    {
        $this->assertOwned($request, $revisionReminder);

        $data = $request->validate([
            'hours' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:72'],
        ]);

        $prefs = $this->preferences->revisionReminders($request->user());
        $hours = isset($data['hours']) ? (int) $data['hours'] : (int) $prefs['snooze_hours'];
        $updated = $this->sync->snooze($revisionReminder, $hours);

        return response()->json([
            'payload' => $this->query->present($updated, $request->user()),
        ]);
    }

    public function dismiss(Request $request, RevisionReminder $revisionReminder): JsonResponse
    {
        $this->assertOwned($request, $revisionReminder);
        $updated = $this->sync->dismiss($revisionReminder);

        return response()->json([
            'payload' => $this->query->present($updated, $request->user()),
        ]);
    }

    public function preferences(Request $request): JsonResponse
    {
        return response()->json([
            'preferences' => $this->preferences->present($request->user()),
        ]);
    }

    public function updatePreferences(Request $request): JsonResponse
    {
        $data = $request->validate([
            'timezone' => ['sometimes', 'nullable', 'string', 'max:64'],
            'revision_reminders' => ['sometimes', 'array'],
            'revision_reminders.in_app' => ['sometimes', 'boolean'],
            'revision_reminders.email' => ['sometimes', 'boolean'],
            'revision_reminders.snooze_hours' => ['sometimes', 'integer', 'min:1', 'max:72'],
            'revision_reminders.max_emails_per_day' => ['sometimes', 'integer', 'min:1', 'max:5'],
        ]);

        $settings = $this->preferences->update($request->user(), $data);

        return response()->json(['preferences' => $settings]);
    }

    private function assertOwned(Request $request, RevisionReminder $reminder): void
    {
        abort_unless((int) $reminder->user_id === (int) $request->user()->id, 404);
    }
}
