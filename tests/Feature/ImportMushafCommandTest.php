<?php

namespace Tests\Feature;

use Tests\TestCase;

class ImportMushafCommandTest extends TestCase
{
    public function test_command_is_registered_for_indopak_edition(): void
    {
        $this->artisan('mushaf:import', ['edition' => 'unknown-mushaf'])
            ->expectsOutputToContain('Unknown mushaf edition')
            ->assertFailed();
    }

    public function test_command_lists_indopak_as_a_known_edition(): void
    {
        $this->artisan('mushaf:import', ['edition' => 'madani-v2'])
            ->expectsOutputToContain('indopak-15-qudratullah')
            ->assertFailed();
    }
}
