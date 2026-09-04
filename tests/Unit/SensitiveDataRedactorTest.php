<?php

namespace Tests\Unit;

use App\Support\SensitiveDataRedactor;
use Tests\TestCase;

class SensitiveDataRedactorTest extends TestCase
{
    public function test_redacts_passwords_tokens_and_audio_fields(): void
    {
        $clean = SensitiveDataRedactor::redact([
            'password' => 'secret12',
            'access_token' => 'abc.def.ghi',
            'reset_token' => 'reset-me',
            'raw_audio' => 'data:audio/webm;base64,AAAA',
            'user_id' => 42,
            'feature' => 'memorisation',
        ]);

        $this->assertSame('[redacted]', $clean['password']);
        $this->assertSame('[redacted]', $clean['access_token']);
        $this->assertSame('[redacted]', $clean['reset_token']);
        $this->assertSame('[redacted]', $clean['raw_audio']);
        $this->assertSame(42, $clean['user_id']);
        $this->assertSame('memorisation', $clean['feature']);
    }

    public function test_redacts_jwt_and_long_arabic_scripture_values(): void
    {
        $jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.signaturepart';
        $ayah = str_repeat('بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ ', 8);

        $this->assertSame('[redacted]', SensitiveDataRedactor::redactString($jwt));
        $this->assertSame('[redacted]', SensitiveDataRedactor::redactString($ayah));
        $this->assertSame('upstream timeout', SensitiveDataRedactor::redactString('upstream timeout'));
        $this->assertSame(
            '[redacted]',
            SensitiveDataRedactor::redactString('https://mutqin.ai/password/reset/abcToken123?email=learner@example.com')
        );
        $this->assertSame(
            '[redacted]',
            SensitiveDataRedactor::redactString('https://app.mutqin.ai/email/verify/12/abcdef123456')
        );
        $this->assertSame(
            '[redacted]',
            SensitiveDataRedactor::redactString('https://app.mutqin.ai/email/verify/12/abcdef?expires=1710000000&signature=abc')
        );
    }
}
