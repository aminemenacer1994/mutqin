<?php

namespace App\Support;

/**
 * Group J3 — capability audit for labelled sandbox demos (live vs simulated).
 */
final class PreviewSandboxCapabilities
{
    public const STATUS_LIVE = 'live';

    public const STATUS_SIMULATED = 'simulated';

    public const STATUS_PARTIAL = 'partial';

    public const STATUS_UNAVAILABLE = 'unavailable';

    /**
     * @return array<string, list<array{id: string, label: string, status: string, note: string|null}>>
     */
    public static function report(): array
    {
        $teacherOn = TeacherFeatures::enabled();

        return [
            'teacher' => [
                self::row('dashboard', 'Class overview and priorities', self::STATUS_LIVE, $teacherOn ? null : 'Enable teacher features locally'),
                self::row('students', 'Student roster and profiles', $teacherOn ? self::STATUS_LIVE : self::STATUS_PARTIAL, null),
                self::row('assignments', 'Create and manage assignments (Hifz, Sabaq, Sabqi, Manzil, revision)', $teacherOn ? self::STATUS_LIVE : self::STATUS_PARTIAL, null),
                self::row('surah_selection', 'Surah and ayah range selection', self::STATUS_LIVE, null),
                self::row('reviews', 'Recitation reviews and wording match', $teacherOn ? self::STATUS_LIVE : self::STATUS_PARTIAL, null),
                self::row('feedback', 'Messages and coaching feedback', $teacherOn ? self::STATUS_LIVE : self::STATUS_PARTIAL, null),
                self::row('learning_plans', 'Learning plans and activation', $teacherOn ? self::STATUS_LIVE : self::STATUS_PARTIAL, null),
                self::row('revision', 'Targeted revision recommendations', $teacherOn ? self::STATUS_LIVE : self::STATUS_PARTIAL, null),
                self::row('attendance', 'Attendance records', $teacherOn ? self::STATUS_LIVE : self::STATUS_PARTIAL, null),
                self::row('reporting', 'Learner progress and parent reports', self::STATUS_PARTIAL, 'Scope follows guardian permissions and report windows'),
                self::row('imports', 'Bulk student import', self::STATUS_SIMULATED, 'Preview uses seeded rosters; CSV import is not part of the demo path'),
                self::row('parent_invites', 'Parent and guardian invitations', $teacherOn ? self::STATUS_LIVE : self::STATUS_PARTIAL, 'Outbound mail is suppressed in sandbox sessions'),
            ],
            'student' => [
                self::row('assignments', 'Teacher-created assignments', $teacherOn ? self::STATUS_LIVE : self::STATUS_PARTIAL, null),
                self::row('daily_tasks', 'Daily learning tasks and due dates', $teacherOn ? self::STATUS_LIVE : self::STATUS_PARTIAL, null),
                self::row('practice', 'Qur\'an practice and submissions', self::STATUS_LIVE, null),
                self::row('samples', 'Approved sample recitation playback', self::STATUS_PARTIAL, 'Depends on teacher-uploaded samples in fixtures'),
                self::row('ai_feedback', 'AI wording checks (labelled)', self::STATUS_LIVE, 'Not Tajweed certification'),
                self::row('teacher_feedback', 'Teacher messages and corrections', $teacherOn ? self::STATUS_LIVE : self::STATUS_PARTIAL, null),
                self::row('revision', 'Revision assignments and weak spots', $teacherOn ? self::STATUS_LIVE : self::STATUS_PARTIAL, null),
                self::row('progress', 'Learning progress and history', self::STATUS_LIVE, null),
            ],
            'parent' => [
                self::row('children', 'Linked demonstration children', self::STATUS_LIVE, 'Platform demo catalogue only'),
                self::row('assignments', 'Assigned learning visibility', self::STATUS_LIVE, null),
                self::row('submissions', 'Submission status and activity', self::STATUS_LIVE, null),
                self::row('attendance', 'Attendance when teachers record it', self::STATUS_PARTIAL, null),
                self::row('feedback', 'Teacher-confirmed feedback', self::STATUS_LIVE, null),
                self::row('progress', 'Authorised progress summaries', self::STATUS_LIVE, null),
                self::row('reports', 'Downloadable learning reports', self::STATUS_PARTIAL, 'Report content follows consent flags'),
            ],
            'personal' => [
                self::row('mushaf_madani', 'Mushaf Madani (Uthmani)', self::STATUS_LIVE, null),
                self::row('hiding', 'Progressive ayah hiding', self::STATUS_LIVE, null),
                self::row('listen_repeat', 'Listen and repeat', self::STATUS_LIVE, null),
                self::row('ai_recite', 'AI recitation check', self::STATUS_LIVE, 'Sandbox session AI quota may apply'),
                self::row('one_ayah', 'One ayah locked mode', self::STATUS_LIVE, null),
                self::row('memory_words', 'Memory words', self::STATUS_LIVE, null),
                self::row('ayah_joining', 'Ayah joining', self::STATUS_LIVE, null),
                self::row('saved_sessions', 'Saved sessions', self::STATUS_LIVE, 'Guest demo: browser-local until account login'),
                self::row('find_ayah', 'Find an ayah', self::STATUS_PARTIAL, 'Premium entitlements; preview tier overlay available'),
                self::row('revision', 'Personal revision', self::STATUS_LIVE, null),
                self::row('translation', 'Translation and transliteration', self::STATUS_LIVE, null),
                self::row('analytics', 'Personal analytics', self::STATUS_PARTIAL, null),
                self::row('mr_mutqin', 'Mr. Mutqin voice assistant', self::STATUS_PARTIAL, 'Shown only when session voice access is enabled'),
            ],
        ];
    }

    /**
     * @return list<string>
     */
    public static function liveCapabilityIds(string $experience): array
    {
        $rows = self::report()[$experience] ?? [];

        return array_values(array_map(
            static fn (array $row): string => $row['id'],
            array_filter($rows, static fn (array $row): bool => $row['status'] === self::STATUS_LIVE)
        ));
    }

    /**
     * @return array{id: string, label: string, status: string, note: string|null}
     */
    private static function row(string $id, string $label, string $status, ?string $note): array
    {
        return [
            'id' => $id,
            'label' => $label,
            'status' => $status,
            'note' => $note,
        ];
    }
}
