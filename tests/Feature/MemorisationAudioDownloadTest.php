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

    public function test_free_user_cannot_download_audio(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->getJson(route('memorisation.audio-download', [
                'url' => self::ALLOWED_URL,
                'filename' => 'surah-1-ayah-1.mp3',
            ]))
            ->assertForbidden()
            ->assertJsonPath('required_tier', 'pro');
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
}
