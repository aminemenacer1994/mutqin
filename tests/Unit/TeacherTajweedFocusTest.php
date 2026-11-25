<?php

namespace Tests\Unit;

use App\Support\TeacherTajweedFocus;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class TeacherTajweedFocusTest extends TestCase
{
    #[DataProvider('tajweedFociProvider')]
    public function test_tajweed_foci_are_recognised(string $focus): void
    {
        $this->assertTrue(TeacherTajweedFocus::isTajweedFocus($focus));
    }

    #[DataProvider('nonTajweedFociProvider')]
    public function test_non_tajweed_foci_are_excluded(?string $focus): void
    {
        $this->assertFalse(TeacherTajweedFocus::isTajweedFocus($focus));
    }

    public static function tajweedFociProvider(): array
    {
        return array_map(static fn (string $focus) => [$focus], TeacherTajweedFocus::TAJWEED_FOCI);
    }

    public static function nonTajweedFociProvider(): array
    {
        return [
            ['pronunciation'],
            ['memorisation'],
            ['other'],
            [null],
            [''],
        ];
    }
}