<?php

namespace Database\Seeders\Concerns;

use App\Support\DatabaseDeploySafety;

trait GuardsDemoSeeding
{
    protected function guardAgainstProductionSeeding(): void
    {
        DatabaseDeploySafety::assertNotProtectedEnvironment(
            'run database seeders'
        );
    }

    protected function assertSafeDemoEmail(string $email): void
    {
        DatabaseDeploySafety::assertDemoEmail($email, 'database seeders');
    }
}
