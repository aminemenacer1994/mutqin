<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class MemorisationAudioDownloadTest extends TestCase
{
    use RefreshDatabase;

    private const ALLOWED_URL = 'https://cdn.islamic.network/quran/audio/128/ar.alafasy/1.mp3';

    public function test_guest_is_redirected_to_login(): void
    {
        $this->get(route('memorisation.audio-download', [
            'url' => self::ALLOWED_URL,
            'filename' => 'surah-1-ayah-1.mp3',
        ]))
            ->assertRedirect(route('login'));
    }

    public function test_free_user_can_download_allowed_cdn_audio(): void
    {
        Http::fake([
            self::ALLOWED_URL => Http::response('fake-audio-bytes', 200, [
                'Content-Type' => 'audio/mpeg',
            ]),
        ]);

        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('memorisation.audio-download', [
                'url' => self::ALLOWED_URL,
                'filename' => 'surah-1-ayah-1.mp3',
            ]))
            ->assertOk()
            ->assertHeader('content-disposition');
    }

    public function test_pro_user_can_download_allowed_cdn_audio(): void
    {
        Http::fake([
            self::ALLOWED_URL => Http::response('fake-audio-bytes', 200, [
                'Content-Type' => 'audio/mpeg',
            ]),
        ]);

        $user = User::factory()->pro()->create();

        $this->actingAs($user)
            ->get(route('memorisation.audio-download', [
                'url' => self::ALLOWED_URL,
                'filename' => 'surah-1-ayah-1.mp3',
            ]))
            ->assertOk()
            ->assertHeader('content-disposition');
    }

    public function test_pro_user_cannot_proxy_unsupported_host(): void
    {
        $user = User::factory()->pro()->create();

        $this->actingAs($user)
            ->get(route('memorisation.audio-download', [
                'url' => 'https://evil.example.com/audio.mp3',
                'filename' => 'surah-1-ayah-1.mp3',
            ]))
            ->assertForbidden();
    }

    public function test_pro_user_gets_bad_request_when_url_missing(): void
    {
        $user = User::factory()->pro()->create();

        $this->actingAs($user)
            ->get(route('memorisation.audio-download', [
                'filename' => 'surah-1-ayah-1.mp3',
            ]))
            ->assertBadRequest();
    }

    public function test_play_mode_returns_inline_audio_with_length(): void
    {
        Http::fake([
            self::ALLOWED_URL => Http::response('fake-audio-bytes', 200, [
                'Content-Type' => 'audio/mpeg',
            ]),
        ]);

        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('memorisation.audio-download', [
                'url' => self::ALLOWED_URL,
                'mode' => 'play',
                'filename' => 'surah-1-ayah-1.mp3',
            ]))
            ->assertOk()
            ->assertHeader('content-type', 'audio/mpeg')
            ->assertHeader('content-disposition', 'inline; filename="surah-1-ayah-1.mp3"')
            ->assertHeader('content-length', (string) strlen('fake-audio-bytes'));
    }

    public function test_play_mode_falls_back_when_primary_cdn_fails(): void
    {
        $fallback = 'https://cdn.alquran.cloud/media/audio/ayah/ar.alafasy/1';

        Http::fake([
            self::ALLOWED_URL => Http::response('missing', 404),
            $fallback => Http::response('fallback-audio-bytes', 200, [
                'Content-Type' => 'audio/mpeg',
            ]),
        ]);

        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('memorisation.audio-download', [
                'url' => self::ALLOWED_URL,
                'mode' => 'play',
                'filename' => 'surah-1-ayah-1.mp3',
            ]))
            ->assertOk()
            ->assertSee('fallback-audio-bytes', false);
    }
}
