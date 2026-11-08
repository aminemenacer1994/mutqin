<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\AskMutqin\CommandInterpreter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AskMutqinCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_interpret_commands(): void
    {
        $this->postJson(route('memorisation.ask-mutqin.interpret'), [
            'transcript' => 'Give me 5 ayahs',
            'surah' => 67,
            'ayah_start' => 6,
        ])->assertUnauthorized();
    }

    public function test_give_me_five_from_ayah_six(): void
    {
        $user = User::factory()->pro()->create();

        $this->actingAs($user)
            ->postJson(route('memorisation.ask-mutqin.interpret'), [
                'transcript' => 'Give me 5 ayahs from here.',
                'surah' => 67,
                'ayah_start' => 6,
            ])
            ->assertOk()
            ->assertJsonPath('ok', true)
            ->assertJsonPath('range.ayah_start', 6)
            ->assertJsonPath('range.ayah_end', 10);
    }

    public function test_next_five_after_this(): void
    {
        $user = User::factory()->pro()->create();

        $this->actingAs($user)
            ->postJson(route('memorisation.ask-mutqin.interpret'), [
                'transcript' => 'Next 5 after this',
                'surah' => 67,
                'ayah_start' => 6,
            ])
            ->assertOk()
            ->assertJsonPath('range.ayah_start', 7)
            ->assertJsonPath('range.ayah_end', 11);
    }

    public function test_until_ayah_and_combined_settings(): void
    {
        $user = User::factory()->pro()->create();

        $this->actingAs($user)
            ->postJson(route('memorisation.ask-mutqin.interpret'), [
                'transcript' => 'Until ayah 12 with Mishary at 0.75 speed and repeat each 3 times',
                'surah' => 67,
                'ayah_start' => 6,
            ])
            ->assertOk()
            ->assertJsonPath('range.ayah_start', 6)
            ->assertJsonPath('range.ayah_end', 12)
            ->assertJsonPath('command.reciter', 'ar.alafasy')
            ->assertJsonPath('command.speed', 0.75)
            ->assertJsonPath('command.repetitions', 3);
    }

    public function test_just_this_ayah_does_not_invent_a_range(): void
    {
        $user = User::factory()->pro()->create();

        $this->actingAs($user)
            ->postJson(route('memorisation.ask-mutqin.interpret'), [
                'transcript' => 'Just this ayah',
                'surah' => 67,
                'ayah_start' => 6,
            ])
            ->assertOk()
            ->assertJsonPath('range.ayah_start', 6)
            ->assertJsonPath('range.ayah_end', 6)
            ->assertJsonPath('range.open_ended', false);
    }

    public function test_open_from_here_is_open_ended(): void
    {
        $user = User::factory()->pro()->create();

        $this->actingAs($user)
            ->postJson(route('memorisation.ask-mutqin.interpret'), [
                'transcript' => 'Open from here',
                'surah' => 67,
                'ayah_start' => 6,
            ])
            ->assertOk()
            ->assertJsonPath('range.ayah_start', 6)
            ->assertJsonPath('range.ayah_end', 6)
            ->assertJsonPath('range.open_ended', true);
    }

    public function test_play_from_here_sets_autoplay(): void
    {
        $user = User::factory()->pro()->create();

        $this->actingAs($user)
            ->postJson(route('memorisation.ask-mutqin.interpret'), [
                'transcript' => 'Play from here',
                'surah' => 67,
                'ayah_start' => 6,
            ])
            ->assertOk()
            ->assertJsonPath('command.intent', 'play')
            ->assertJsonPath('command.autoplay', true);
    }

    public function test_make_it_slower_steps_down_from_current_speed(): void
    {
        $interpreter = app(CommandInterpreter::class);
        $result = $interpreter->interpret('Make it slower', 67, 6, 1.0);

        $this->assertTrue($result['ok']);
        $this->assertSame(0.75, $result['command']['speed']);
    }

    public function test_session_voice_command_uses_the_existing_endpoint_family(): void
    {
        $user = User::factory()->pro()->create();

        $this->actingAs($user)
            ->postJson(route('memorisation.ask-mutqin.interpret-session'), [
                'transcript' => 'Play Surah Al-Fatiha from ayah 1 to ayah 5 with Al-Sudais at 0.5x, repeated 3 times.',
            ])
            ->assertOk()
            ->assertJsonPath('ok', true)
            ->assertJsonPath('command.surah', 1)
            ->assertJsonPath('command.start_ayah', 1)
            ->assertJsonPath('command.end_ayah', 5)
            ->assertJsonPath('command.reciter', 'ar.abdurrahmaansudais')
            ->assertJsonPath('command.repetitions', 3)
            ->assertJsonPath('command.speed', 0.5)
            ->assertJsonPath('command.goal', 'memorise');
    }

    public function test_guest_cannot_interpret_a_session_voice_command(): void
    {
        $this->postJson(route('memorisation.ask-mutqin.interpret-session'), [
            'transcript' => 'Play Al-Fatiha',
        ])->assertUnauthorized();
    }

    public function test_session_voice_is_limited_to_the_super_admin_when_deployed(): void
    {
        $this->app['env'] = 'production';
        config()->set('mutqin.admin_emails', ['menacer72@gmail.com']);

        $learner = User::factory()->pro()->create([
            'email' => 'learner@example.com',
            'is_admin' => false,
        ]);

        $this->actingAs($learner)
            ->postJson(route('memorisation.ask-mutqin.interpret-session'), [
                'transcript' => 'Play Surah Al-Fatiha',
            ])
            ->assertForbidden();

        $admin = User::factory()->pro()->admin()->create([
            'email' => 'menacer72@gmail.com',
            'email_verified_at' => now(),
        ]);

        $this->actingAs($admin)
            ->postJson(route('memorisation.ask-mutqin.interpret-session'), [
                'transcript' => 'Play Surah Al-Fatiha',
            ])
            ->assertOk()
            ->assertJsonPath('ok', true)
            ->assertJsonPath('command.surah', 1);
    }

    public function test_invalid_ayah_is_rejected(): void
    {
        $user = User::factory()->pro()->create();

        $this->actingAs($user)
            ->postJson(route('memorisation.ask-mutqin.interpret'), [
                'transcript' => 'Give me 5',
                'surah' => 67,
                'ayah_start' => 99,
            ])
            ->assertStatus(422);
    }
}
