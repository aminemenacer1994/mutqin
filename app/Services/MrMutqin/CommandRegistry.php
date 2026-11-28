<?php

namespace App\Services\MrMutqin;

use App\Enums\MrMutqinResponseMode;

/**
 * Allowlisted intents and default response modes (semantic defaults, not keyword locks).
 */
final class CommandRegistry
{
    /**
     * @return array<string, array{default_mode: MrMutqinResponseMode, handler: string, speakable: bool}>
     */
    public function definitions(): array
    {
        return [
            'teacher.students.count' => [
                'default_mode' => MrMutqinResponseMode::AnswerOnly,
                'handler' => 'teacher',
                'speakable' => true,
            ],
            'teacher.students.list' => [
                'default_mode' => MrMutqinResponseMode::NavigateOnly,
                'handler' => 'teacher',
                'speakable' => false,
            ],
            'teacher.student.open' => [
                'default_mode' => MrMutqinResponseMode::NavigateOnly,
                'handler' => 'teacher',
                'speakable' => false,
            ],
            'teacher.assignments.overdue' => [
                'default_mode' => MrMutqinResponseMode::AnswerAndNavigate,
                'handler' => 'teacher',
                'speakable' => true,
            ],
            'teacher.reviews.pending' => [
                'default_mode' => MrMutqinResponseMode::AnswerAndNavigate,
                'handler' => 'teacher',
                'speakable' => true,
            ],
            'teacher.messages.unread' => [
                'default_mode' => MrMutqinResponseMode::AnswerOnly,
                'handler' => 'teacher',
                'speakable' => true,
            ],
            'teacher.attendance.today' => [
                'default_mode' => MrMutqinResponseMode::NavigateOnly,
                'handler' => 'teacher',
                'speakable' => false,
            ],
            'teacher.overview.priorities' => [
                'default_mode' => MrMutqinResponseMode::AnswerAndNavigate,
                'handler' => 'teacher',
                'speakable' => true,
            ],
            'student.homework.status' => [
                'default_mode' => MrMutqinResponseMode::AnswerOnly,
                'handler' => 'student',
                'speakable' => true,
            ],
            'student.homework.open' => [
                'default_mode' => MrMutqinResponseMode::NavigateOnly,
                'handler' => 'student',
                'speakable' => false,
            ],
            'student.progress.open' => [
                'default_mode' => MrMutqinResponseMode::NavigateOnly,
                'handler' => 'student',
                'speakable' => false,
            ],
            'student.learning.open' => [
                'default_mode' => MrMutqinResponseMode::NavigateOnly,
                'handler' => 'student',
                'speakable' => false,
            ],
            'student.messages.open' => [
                'default_mode' => MrMutqinResponseMode::NavigateOnly,
                'handler' => 'student',
                'speakable' => false,
            ],
            'student.memorisation.continue' => [
                'default_mode' => MrMutqinResponseMode::NavigateOnly,
                'handler' => 'student',
                'speakable' => false,
            ],
            'quran.session.setup' => [
                'default_mode' => MrMutqinResponseMode::NavigateOnly,
                'handler' => 'session',
                'speakable' => true,
            ],
            'quran.workspace.control' => [
                'default_mode' => MrMutqinResponseMode::ExecuteAction,
                'handler' => 'session',
                'speakable' => false,
            ],
            'unknown' => [
                'default_mode' => MrMutqinResponseMode::Clarify,
                'handler' => 'none',
                'speakable' => false,
            ],
        ];
    }

    public function defaultMode(string $intent): MrMutqinResponseMode
    {
        return $this->definitions()[$intent]['default_mode']
            ?? MrMutqinResponseMode::Clarify;
    }

    public function isRegistered(string $intent): bool
    {
        return isset($this->definitions()[$intent]) && $intent !== 'unknown';
    }
}