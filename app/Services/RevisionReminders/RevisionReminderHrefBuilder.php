<?php

namespace App\Services\RevisionReminders;

use App\Models\RevisionReminder;

/** Build memorisation deep links for Start Revision actions. */
final class RevisionReminderHrefBuilder
{
    public function forReminder(RevisionReminder $reminder): string
    {
        $settings = is_array($reminder->session_settings) ? $reminder->session_settings : [];
        $params = [
            'surah' => (int) $reminder->surah_number,
            'from' => (int) $reminder->ayah_start,
            'to' => (int) $reminder->ayah_end,
            'review' => 1,
            'return' => 'dashboard',
        ];

        if (! empty($reminder->teacher_assignment_recipient_id)) {
            $params['assignment_recipient'] = (int) $reminder->teacher_assignment_recipient_id;
        }

        foreach (['reciter', 'speed', 'repetitions', 'technique'] as $key) {
            if (isset($settings[$key]) && $settings[$key] !== '' && $settings[$key] !== null) {
                $params[$key] = $settings[$key];
            }
        }

        if (! empty($settings['recommendation_id'])) {
            $params['recommendation'] = (int) $settings['recommendation_id'];
        }

        return $this->memorisationHref($params);
    }

    /**
     * @param  array<string, scalar|null>  $query
     */
    public function memorisationHref(array $query = []): string
    {
        $base = route('memorisation');
        $clean = [];
        foreach ($query as $key => $value) {
            if ($value === null || $value === '' || $value === false) {
                continue;
            }
            $clean[$key] = $value === true ? 1 : $value;
        }

        return $clean === [] ? $base : $base.'?'.http_build_query($clean);
    }
}
