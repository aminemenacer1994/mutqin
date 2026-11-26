<?php

namespace App\Support;

use App\Models\User;
use App\Support\Demo\OrganisationNetworkCatalog;
use App\Support\Demo\PlatformDemoCatalog;

/**
 * Closed personas for the marketing preview demo sandbox (Groups F and J1).
 * Only synthetic accounts with known ownership markers may be used.
 */
final class LandingPreviewDemo
{
    public const SESSION_KEY = 'mutqin_landing_preview_demo';

    public const OWNER_SESSION_KEY = 'mutqin_landing_preview_owner_id';

    public const GUIDED_SESSION_KEY = 'mutqin_landing_preview_demo_guided';

    public const WALKTHROUGH_STORAGE_KEY = 'mutqin_sandbox_walkthrough';

    public const WALKTHROUGH_ID_SESSION_KEY = 'mutqin_sandbox_walkthrough_id';

    public const CLASSROOM_ORG_HALAQA = 'org_halaqa_network';

    public const CLASSROOM_PLATFORM = 'platform_demo';

    public const CLASSROOM_PERSONAL = 'personal_learning';

    /**
     * @return list<array{
     *     id: string,
     *     experience: string,
     *     role: string,
     *     title: string,
     *     preview_asset: string,
     *     description: string,
     *     email: string|null,
     *     catalog: string,
     *     classroom_key: string,
     *     simulated: list<string>,
     *     redirect: string,
     *     requires_login: bool
     * }>
     */
    public static function personas(): array
    {
        $platformParents = PlatformDemoCatalog::parents();

        return [
            [
                'id' => 'org_halaqa_teacher',
                'experience' => 'teacher',
                'preview_asset' => '/preview/assets/overview-priorities.png',
                'role' => 'teacher',
                'title' => 'Teacher — Nur al-Huda Halaqa',
                'description' => 'Class overview, assignments, reviews and guardian invites with synthetic students.',
                'email' => OrganisationNetworkCatalog::teacherEmail('halaqa', 1),
                'catalog' => 'OrganisationNetworkCatalog',
                'classroom_key' => self::CLASSROOM_ORG_HALAQA,
                'simulated' => ['Student roster', 'AI wording scores', 'Assignments', 'Recitation history'],
                'redirect' => '/teacher',
                'requires_login' => true,
            ],
            [
                'id' => 'org_halaqa_student',
                'experience' => 'student',
                'preview_asset' => '/preview/assets/students.png',
                'role' => 'student',
                'title' => 'Connected student — same halaqa',
                'description' => 'Assignments, practice attempts and teacher messages on a demo learner account.',
                'email' => OrganisationNetworkCatalog::studentEmail('halaqa', 1),
                'catalog' => 'OrganisationNetworkCatalog',
                'classroom_key' => self::CLASSROOM_ORG_HALAQA,
                'simulated' => ['Class assignments', 'Progress tiles', 'Teacher thread'],
                'redirect' => '/dashboard',
                'requires_login' => true,
            ],
            [
                'id' => 'platform_teacher',
                'experience' => 'teacher',
                'preview_asset' => '/preview/assets/overview.png',
                'role' => 'teacher',
                'title' => 'Teacher — platform demo cohort',
                'description' => 'Interconnected teacher/student/parent demo seeded via PlatformDemoCatalog.',
                'email' => PlatformDemoCatalog::teachers()[0]['email'],
                'catalog' => 'PlatformDemoCatalog',
                'classroom_key' => self::CLASSROOM_PLATFORM,
                'simulated' => ['Multi-group class', 'Parent threads', 'Learning plans'],
                'redirect' => '/teacher',
                'requires_login' => true,
            ],
            [
                'id' => 'platform_classroom_student',
                'experience' => 'student',
                'preview_asset' => '/preview/assets/assignment-detail.png',
                'role' => 'student',
                'title' => 'Student — same platform halaqa',
                'description' => 'Switch to a learner in the same seeded classroom as the platform teacher and parent.',
                'email' => PlatformDemoCatalog::students()[0]['email'],
                'catalog' => 'PlatformDemoCatalog',
                'classroom_key' => self::CLASSROOM_PLATFORM,
                'simulated' => ['Assignments', 'Practice history', 'Teacher messages'],
                'redirect' => '/dashboard',
                'requires_login' => true,
            ],
            [
                'id' => 'platform_classroom_parent',
                'experience' => 'parent',
                'preview_asset' => '/preview/assets/parents.png',
                'role' => 'parent',
                'title' => 'Parent — linked guardians',
                'description' => 'Guardian visibility and messaging on the same platform demo classroom.',
                'email' => $platformParents[0]['email'],
                'catalog' => 'PlatformDemoCatalog',
                'classroom_key' => self::CLASSROOM_PLATFORM,
                'simulated' => ['Child progress', 'Teacher threads', 'Deadline reminders'],
                'redirect' => '/parent',
                'requires_login' => true,
            ],
            [
                'id' => 'memorisation_guest',
                'experience' => 'personal',
                'preview_asset' => '/images/landing/2026-11-session-setup.jpg',
                'role' => 'learner',
                'title' => 'Personal memorisation (guest)',
                'description' => 'Try listen/repeat in the workspace without saving to a real account.',
                'email' => null,
                'catalog' => 'memorisation.demo',
                'classroom_key' => self::CLASSROOM_PERSONAL,
                'simulated' => ['Session setup', 'AI checks (not persisted)', 'Progress (local only)'],
                'redirect' => '/preview/demo/memorisation',
                'requires_login' => false,
            ],
        ];
    }

    public static function persona(string $id): ?array
    {
        foreach (self::personas() as $persona) {
            if ($persona['id'] === $id) {
                return $persona;
            }
        }

        return null;
    }

    /**
     * Marketing entry experiences (Group J2).
     *
     * @return list<array{
     *     experience: string,
     *     persona_ids: list<string>,
     *     preview_asset: string
     * }>
     */
    public static function experiences(): array
    {
        return [
            [
                'experience' => 'teacher',
                'persona_ids' => ['platform_teacher', 'org_halaqa_teacher'],
                'preview_asset' => '/preview/assets/overview-priorities.png',
            ],
            [
                'experience' => 'student',
                'persona_ids' => ['platform_classroom_student', 'org_halaqa_student'],
                'preview_asset' => '/preview/assets/students.png',
            ],
            [
                'experience' => 'parent',
                'persona_ids' => ['platform_classroom_parent'],
                'preview_asset' => '/preview/assets/parents.png',
            ],
            [
                'experience' => 'personal',
                'persona_ids' => ['memorisation_guest'],
                'preview_asset' => '/images/landing/2026-11-session-setup.jpg',
            ],
            [
                'experience' => 'connected',
                'persona_ids' => ['platform_teacher'],
                'preview_asset' => '/preview/assets/overview-priorities.png',
            ],
        ];
    }

    public static function resolveWalkthroughId(string $experience, bool $guided, ?array $persona): string
    {
        if (! $guided) {
            return '';
        }

        if ($experience === 'connected') {
            return 'connected';
        }

        if ($experience !== '') {
            return $experience;
        }

        return (string) ($persona['experience'] ?? '');
    }

    public static function resolveExperiencePersonaId(string $experience): ?string
    {
        foreach (self::experiences() as $row) {
            if (($row['experience'] ?? '') !== $experience) {
                continue;
            }

            foreach ($row['persona_ids'] as $personaId) {
                $persona = self::persona($personaId);
                if ($persona === null) {
                    continue;
                }

                if ($persona['requires_login'] !== true) {
                    return $personaId;
                }

                if (self::resolveDemoUser($personaId) instanceof User) {
                    return $personaId;
                }
            }
        }

        return null;
    }

    public static function personaForExperience(string $experience): ?array
    {
        $personaId = self::resolveExperiencePersonaId($experience);

        return $personaId ? self::persona($personaId) : null;
    }

    /**
     * @return list<array<string, mixed>>
     */
    public static function switchablePersonas(?string $classroomKey): array
    {
        $personas = self::personas();

        if ($classroomKey === null || $classroomKey === '') {
            return $personas;
        }

        return array_values(array_filter(
            $personas,
            static fn (array $persona): bool => ($persona['classroom_key'] ?? '') === $classroomKey
                || ($persona['classroom_key'] ?? '') === self::CLASSROOM_PERSONAL
        ));
    }

    /**
     * @return list<array{id: string, experience: string, title: string, redirect: string}>
     */
    public static function toolbarPersonas(): array
    {
        return array_map(static fn (array $persona): array => [
            'id' => $persona['id'],
            'experience' => $persona['experience'],
            'title' => $persona['title'],
            'redirect' => $persona['redirect'],
        ], self::personas());
    }

    public static function resolveDemoUser(string $personaId): ?User
    {
        $persona = self::persona($personaId);
        if ($persona === null || $persona['requires_login'] !== true || $persona['email'] === null) {
            return null;
        }

        $user = User::query()->where('email', $persona['email'])->first();
        if ($user === null || ! self::isSyntheticDemoUser($user)) {
            return null;
        }

        return $user;
    }

    public static function isSyntheticDemoUser(User $user): bool
    {
        $marker = (string) ($user->stripe_customer_id ?? '');
        if ($marker === '') {
            return false;
        }

        $prefixes = [
            OrganisationNetworkCatalog::MARKER,
            PlatformDemoCatalog::MARKER_PREFIX,
            'cus_mutqin_teacher_demo_',
            'cus_mutqin_parent_demo_',
        ];

        foreach ($prefixes as $prefix) {
            if (str_starts_with($marker, $prefix)) {
                return true;
            }
        }

        $email = strtolower((string) $user->email);

        return str_ends_with($email, '@mutqin.test')
            || str_ends_with($email, '@example.com') && str_contains($email, '.demo.');
    }

    /**
     * @return array<string, mixed>|null
     */
    public static function sessionPayload(string $personaId, ?string $sandboxSessionId = null): ?array
    {
        $persona = self::persona($personaId);
        if ($persona === null) {
            return null;
        }

        $payload = [
            'persona' => $personaId,
            'catalog' => $persona['catalog'],
            'classroom_key' => $persona['classroom_key'],
            'role' => $persona['role'],
            'label' => $persona['title'],
            'started_at' => now()->toIso8601String(),
        ];

        if (is_string($sandboxSessionId) && $sandboxSessionId !== '') {
            $payload['sandbox_session_id'] = $sandboxSessionId;
        }

        return $payload;
    }
}
