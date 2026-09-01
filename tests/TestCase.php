<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected function requireEmailVerification(): void
    {
        config(['auth.require_email_verification' => true]);
    }
}
