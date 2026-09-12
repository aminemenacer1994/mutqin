<?php

namespace Tests\Feature;

use App\Models\AiReciteAttempt;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AiReciteAttemptAudioTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_can_store_and_stream_attempt_audio(): void
    {
        Storage::fake('local');
        config(['mutqin.audio_privacy.raw_recording_retention' => 'retain']);

        $user = User::factory()->pro()->create();
        $attempt = $this->makeAttempt($user);

        $upload = $this->actingAs($user)->post(
            '/api/ai-recite-attempts/'.$attempt->id.'/audio',
            [
                'audio' => $this->audioFile(),
                'duration_ms' => 3200,
            ],
            ['Accept' => 'application/json']
        );

        $upload->assertOk()
            ->assertJsonPath('audio.available', true)
            ->assertJsonPath('audio.url', '/api/ai-recite-attempts/'.$attempt->id.'/audio')
            ->assertJsonPath('audio.duration_ms', 3200);

        $this->actingAs($user)
            ->getJson('/api/ai-recite-attempts/'.$attempt->id)
            ->assertOk()
            ->assertJsonPath('audio.available', true)
            ->assertJsonPath('audio.url', '/api/ai-recite-attempts/'.$attempt->id.'/audio');

        $this->actingAs($user)
            ->getJson('/api/ai-recite-attempts')
            ->assertOk()
            ->assertJsonPath('attempts.0.has_audio', true)
            ->assertJsonMissing(['audio_path']);

        $this->actingAs($user)
            ->get('/api/ai-recite-attempts/'.$attempt->id.'/audio')
            ->assertOk()
            ->assertHeader('content-type', 'audio/webm');
    }

    public function test_other_user_cannot_access_attempt_audio(): void
    {
        Storage::fake('local');
        config(['mutqin.audio_privacy.raw_recording_retention' => 'retain']);

        $owner = User::factory()->pro()->create();
        $other = User::factory()->pro()->create();
        $attempt = $this->makeAttempt($owner);

        $this->actingAs($owner)->post(
            '/api/ai-recite-attempts/'.$attempt->id.'/audio',
            ['audio' => $this->audioFile()],
            ['Accept' => 'application/json']
        )->assertOk();

        $this->actingAs($other)
            ->get('/api/ai-recite-attempts/'.$attempt->id.'/audio')
            ->assertNotFound();

        $this->actingAs($other)
            ->getJson('/api/ai-recite-attempts/'.$attempt->id)
            ->assertNotFound();
    }

    public function test_never_retention_does_not_keep_audio(): void
    {
        Storage::fake('local');
        config(['mutqin.audio_privacy.raw_recording_retention' => 'never']);

        $user = User::factory()->pro()->create();
        $attempt = $this->makeAttempt($user);

        $this->actingAs($user)->post(
            '/api/ai-recite-attempts/'.$attempt->id.'/audio',
            ['audio' => $this->audioFile()],
            ['Accept' => 'application/json']
        )->assertOk()
            ->assertJsonPath('audio.available', false);

        $attempt->refresh();
        $this->assertNull($attempt->audio_path);
    }

    public function test_temporary_audio_expires_and_analysis_remains(): void
    {
        Storage::fake('local');
        config([
            'mutqin.audio_privacy.raw_recording_retention' => 'temporary',
            'mutqin.audio_privacy.temporary_ttl_hours' => 24,
        ]);

        $user = User::factory()->pro()->create();
        $attempt = $this->makeAttempt($user);

        $this->actingAs($user)->post(
            '/api/ai-recite-attempts/'.$attempt->id.'/audio',
            ['audio' => $this->audioFile()],
            ['Accept' => 'application/json']
        )->assertOk()
            ->assertJsonPath('audio.available', true);

        $attempt->refresh()->forceFill([
            'audio_expires_at' => now()->subMinute(),
        ])->save();

        $this->actingAs($user)
            ->getJson('/api/ai-recite-attempts/'.$attempt->id)
            ->assertOk()
            ->assertJsonPath('has_analysis', true)
            ->assertJsonPath('audio.available', false)
            ->assertJsonPath('audio.reason', 'expired');

        $this->actingAs($user)
            ->get('/api/ai-recite-attempts/'.$attempt->id.'/audio')
            ->assertNotFound();
    }

    private function makeAttempt(User $user): AiReciteAttempt
    {
        return AiReciteAttempt::create([
            'user_id' => $user->id,
            'source' => AiReciteAttempt::SOURCE_DASHBOARD,
            'attempt_number' => 1,
            'accuracy_percent' => 88,
            'band' => 'strong',
            'ayah_range' => ['surah' => 1, 'from' => 1, 'to' => 5, 'surah_name' => 'Al-Fatihah'],
        ]);
    }

    private function audioFile(): UploadedFile
    {
        return UploadedFile::fake()->createWithContent(
            'recitation.webm',
            str_repeat('R', 2048),
        );
    }
}
