<?php

namespace Tests\Unit;

use App\Support\SessionDefaults;
use PHPUnit\Framework\TestCase;

class SessionDefaultsTest extends TestCase
{
    public function test_new_session_repetitions_default_is_one(): void
    {
        $this->assertSame(1, SessionDefaults::REPETITIONS);
        $this->assertNotSame(2, SessionDefaults::REPETITIONS);
    }
}
