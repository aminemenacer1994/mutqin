<?php

namespace App\Support;

use InvalidArgumentException;
use RuntimeException;

/**
 * Production-facing guards for migrations, seeders, and demo account helpers.
 *
 * Destructive reset commands are separately prohibited via
 * DB::prohibitDestructiveCommands() in AppServiceProvider.
 */
final class DatabaseDeploySafety
{
    /**
     * Domains reserved for local/staging demo accounts. Never use these in
     * production user signup flows as durable real identities.
     *
     * @var list<string>
     */
    public const DEMO_EMAIL_SUFFIXES = [
        '@mutqin.test',
        '@example.com',
        '@example.org',
        '@example.net',
    ];

    public static function isProtectedEnvironment(?string $env = null): bool
    {
        $env ??= (string) app()->environment();

        return in_array($env, ['production', 'prod'], true);
    }

    public static function assertNotProtectedEnvironment(string $action): void
    {
        if (! self::isProtectedEnvironment()) {
            return;
        }

        throw new RuntimeException(
            "Refusing to {$action} while APP_ENV is production. ".
            'Production data must not be reset, seeded, or overwritten by demo tooling.'
        );
    }

    public static function isDemoEmail(string $email): bool
    {
        $email = strtolower(trim($email));

        if ($email === '' || ! str_contains($email, '@')) {
            return false;
        }

        foreach (self::DEMO_EMAIL_SUFFIXES as $suffix) {
            if (str_ends_with($email, $suffix)) {
                return true;
            }
        }

        return false;
    }

    public static function assertDemoEmail(string $email, string $context = 'demo tooling'): void
    {
        if (self::isDemoEmail($email)) {
            return;
        }

        throw new InvalidArgumentException(
            "Refusing to use non-demo email [{$email}] for {$context}. ".
            'Demo accounts must use a reserved domain ('.implode(', ', self::DEMO_EMAIL_SUFFIXES).').'
        );
    }

    /**
     * Environments where php artisan migrate --force is an expected deploy step.
     */
    public static function allowsForcedMigrate(?string $env = null): bool
    {
        $env ??= (string) app()->environment();

        return in_array($env, ['production', 'prod', 'staging'], true);
    }
}
