<?php

namespace Tests\Unit;

use App\Support\WaitingListEmailHash;
use PHPUnit\Framework\TestCase;

class WaitingListEmailHashTest extends TestCase
{
    public function test_normalize_and_digest_are_case_insensitive(): void
    {
        $this->assertSame('user@example.com', WaitingListEmailHash::normalize('  User@Example.COM '));
        $this->assertSame(
            WaitingListEmailHash::digest('user@example.com'),
            WaitingListEmailHash::digest('USER@example.com')
        );
    }
}
