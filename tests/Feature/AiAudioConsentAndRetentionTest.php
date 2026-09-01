<?php

namespace Tests\Feature;

use App\Models\MemorisationSyncState;
use App\Models\User;
use App\Services\Auth\AiAudioConsentService;
use App\Services\Memorisation\LearningHistoryRetentionService;
use App\Support\AudioPrivacy;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\File;
use Tests\TestCase;

class AiAudioConsentAndRetentionTest extends TestCase
{
    use RefreshDatabase;

    public function test_first_use_needs_consent_and_accept_persists_policy_version(): void
    {
        $user = User::factory()->create([
            'ai_audio_consent_status' => null,
            'ai_audio_consent_version' => null,
            'ai_audio_consent_at' => null,
        ]);

        $this->actingAs($user)
            ->getJson(route('api.profile.ai-audio-consent.show'))
            ->assertOk()
            ->assertJsonPath('needs_consent', true)
            ->assertJsonPath('policy_version', AudioPrivacy::policyVersion())
            ->assertJsonPath('processor_name', AudioPrivacy::processorName());

        $this->actingAs($user)
            ->patchJson(route('api.profile.ai-audio-consent.update'), ['accepted' => true])
            ->assertOk()
            ->assertJsonPath('status', AiAudioConsentService::STATUS_ACCEPTED)
            ->assertJsonPath('needs_consent', false)
            ->assertJsonPath('version', AudioPrivacy::policyVersion());

        $user->refresh();
        $this->assertSame(AiAudioConsentService::STATUS_ACCEPTED, $user->ai_audio_consent_status);
        $this->assertSame(AudioPrivacy::policyVersion(), $user->ai_audio_consent_version);
        $this->assertNotNull($user->ai_audio_consent_at);
    }

    public function test_declined_consent_is_persisted_and_does_not_reprompt(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->patchJson(route('api.profile.ai-audio-consent.update'), ['accepted' => false])
            ->assertOk()
            ->assertJsonPath('status', AiAudioConsentService::STATUS_DECLINED)
            ->assertJsonPath('needs_consent', false);

        $this->assertSame(AiAudioConsentService::STATUS_DECLINED, $user->fresh()->ai_audio_consent_status);
        $this->assertFalse(app(AiAudioConsentService::class)->needsConsent($user->fresh()));
    }

    public function test_policy_version_change_does_not_reprompt_after_registration_answer(): void
    {
        $user = User::factory()->create([
            'ai_audio_consent_status' => AiAudioConsentService::STATUS_ACCEPTED,
            'ai_audio_consent_version' => 'old-policy',
            'ai_audio_consent_at' => now()->subDay(),
        ]);

        config(['mutqin.audio_privacy.policy_version' => '2026-09-01-b']);

        $this->assertFalse(app(AiAudioConsentService::class)->needsConsent($user));

        $this->actingAs($user)
            ->getJson(route('api.profile.ai-audio-consent.show'))
            ->assertOk()
            ->assertJsonPath('needs_consent', false)
            ->assertJsonPath('policy_version', '2026-09-01-b');
    }

    public function test_privacy_policy_page_renders_and_mentions_processor(): void
    {
        $this->get(route('privacy'))
            ->assertOk()
            ->assertSee('privacy-policy-page', false);
    }

    public function test_temporary_file_cleanup_deletes_expired_audio_and_keeps_fresh(): void
    {
        config([
            'mutqin.audio_privacy.raw_recording_retention' => 'temporary',
            'mutqin.audio_privacy.temporary_ttl_hours' => 1,
        ]);

        $retention = app(LearningHistoryRetentionService::class);
        $dir = $retention->ensureTemporaryAudioDirectory();

        $expired = $dir.DIRECTORY_SEPARATOR.'expired-audio.bin';
        $fresh = $dir.DIRECTORY_SEPARATOR.'fresh-audio.bin';
        File::put($expired, 'expired-bytes');
        File::put($fresh, 'fresh-bytes');
        touch($expired, now()->subHours(3)->getTimestamp());
        touch($fresh, now()->subMinutes(5)->getTimestamp());

        $deleted = $retention->purgeExpiredTemporaryAudioFiles(1);

        $this->assertSame(1, $deleted);
        $this->assertFalse(File::exists($expired));
        $this->assertTrue(File::exists($fresh));

        File::delete($fresh);
    }

    public function test_provider_failure_cleanup_command_scrubs_sync_audio_and_temp_files(): void
    {
        config([
            'mutqin.audio_privacy.raw_recording_retention' => 'temporary',
            'mutqin.audio_privacy.temporary_ttl_hours' => 24,
        ]);

        $user = User::factory()->create();
        MemorisationSyncState::query()->create([
            'user_id' => $user->id,
            'state' => json_encode([
                'progress' => ['ok' => true],
                'recordingsLibrary' => [[
                    'id' => 'rec-1',
                    'audioSrc' => 'data:audio/webm;base64,AAAA',
                    'audioBlob' => 'should-not-remain',
                    'transcript' => 'بسم',
                ]],
            ], JSON_UNESCAPED_UNICODE),
            'payload_hash' => 'hash',
            'state_updated_at' => now(),
        ]);

        $retention = app(LearningHistoryRetentionService::class);
        $dir = $retention->ensureTemporaryAudioDirectory();
        $tempFile = $dir.DIRECTORY_SEPARATOR.'failed-provider.bin';
        File::put($tempFile, 'temp');
        touch($tempFile, now()->subDays(2)->getTimestamp());

        Artisan::call('mutqin:purge-learning-history', [
            '--purge-temp-audio' => true,
            '--strip-sync-audio' => true,
            '--ttl-hours' => 1,
        ]);

        $this->assertFalse(File::exists($tempFile));

        $state = json_decode(
            (string) MemorisationSyncState::query()->where('user_id', $user->id)->value('state'),
            true
        );
        $this->assertSame(['ok' => true], $state['progress'] ?? null);
        $this->assertSame('', $state['recordingsLibrary'][0]['audioSrc'] ?? null);
        $this->assertArrayHasKey('audioBlob', $state['recordingsLibrary'][0]);
        $this->assertNull($state['recordingsLibrary'][0]['audioBlob']);
    }

    public function test_staged_temporary_audio_is_deleted_after_provider_failure_cleanup(): void
    {
        config(['mutqin.audio_privacy.raw_recording_retention' => 'temporary']);

        $retention = app(LearningHistoryRetentionService::class);
        $path = $retention->stageTemporaryAudioFile('fake-pcm-bytes', 'webm');
        $this->assertNotNull($path);
        $this->assertFileExists($path);

        $this->assertTrue($retention->deleteTemporaryAudioFile($path));
        $this->assertFileDoesNotExist($path);
    }

    public function test_never_retention_mode_purges_all_temp_files_immediately(): void
    {
        config(['mutqin.audio_privacy.raw_recording_retention' => 'never']);

        $retention = app(LearningHistoryRetentionService::class);
        $dir = $retention->ensureTemporaryAudioDirectory();
        $file = $dir.DIRECTORY_SEPARATOR.'immediate.bin';
        File::put($file, 'x');
        touch($file, now()->getTimestamp());

        $deleted = $retention->purgeExpiredTemporaryAudioFiles();

        $this->assertSame(1, $deleted);
        $this->assertFalse(File::exists($file));
    }
}
