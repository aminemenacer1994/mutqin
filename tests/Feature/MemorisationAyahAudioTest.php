<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class MemorisationAyahAudioTest extends TestCase
{
    use RefreshDatabase;

    private const PRIMARY = 'https://cdn.islamic.network/quran/audio/128/ar.alafasy/1.mp3';

    private const FALLBACK = 'https://cdn.alquran.cloud/media/audio/ayah/ar.alafasy/1';

    public function test_bundled_ayah_audio_proxies_from_cdn_when_local_file_missing(): void
    {
        Http::fake([
            self::PRIMARY => Http::response('fake-audio-bytes', 200, [
                'Content-Type' => 'audio/mpeg',
            ]),
        ]);

        $this->get('/audio/ayah/ar.alafasy/1.mp3')
            ->assertOk()
            ->assertHeader('content-type', 'audio/mpeg')
            ->assertHeader('content-disposition', 'inline; filename="1.mp3"')
            ->assertHeader('content-length', (string) strlen('fake-audio-bytes'));
    }

    public function test_bundled_ayah_audio_falls_back_to_alquran_cloud(): void
    {
        Http::fake([
            self::PRIMARY => Http::response('missing', 404),
            self::FALLBACK => Http::response('fallback-audio-bytes', 200, [
                'Content-Type' => 'audio/mpeg',
            ]),
        ]);

        $this->get('/audio/ayah/ar.alafasy/1.mp3')
            ->assertOk()
            ->assertSee('fallback-audio-bytes', false);
    }

    public function test_bundled_ayah_audio_rejects_out_of_range_ayah(): void
    {
        $this->get('/audio/ayah/ar.alafasy/0.mp3')
            ->assertNotFound();
    }
}
