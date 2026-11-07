<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected function requireEmailVerification(): void
    {
        config(['auth.require_email_verification' => true]);
    }

    protected function enableTeacherFeatures(): void
    {
        config([
            'mutqin.teacher_features_enabled' => true,
            'mutqin.learner_teacher_section_enabled' => true,
        ]);
    }

    protected function enableArticles(): void
    {
        config(['mutqin.show_articles' => true]);
    }

    protected function enableDonation(): void
    {
        config(['mutqin.show_donate' => true]);
    }

    protected function enableHowItWorks(): void
    {
        config(['mutqin.show_how_it_works' => true]);
    }
}
