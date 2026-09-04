<?php

namespace Tests\Feature;

use App\Support\TransactionalMail;
use Illuminate\Support\Facades\File;
use Tests\TestCase;

class MailPreviewCommandTest extends TestCase
{
    public function test_command_refuses_to_run_when_preview_is_disabled(): void
    {
        config(['mail.preview.enabled' => false]);

        $this->artisan('mutqin:mail-preview', ['template' => 'verify'])
            ->assertFailed()
            ->expectsOutputToContain('MAIL_PREVIEW_ENABLED');
    }

    public function test_command_refuses_to_run_in_production(): void
    {
        config(['mail.preview.enabled' => true]);
        $this->app['env'] = 'production';

        $this->artisan('mutqin:mail-preview', ['template' => 'verify', '--write' => storage_path('framework/testing/mail-preview')])
            ->assertFailed()
            ->expectsOutputToContain('production');
    }

    public function test_command_writes_html_and_text_previews_without_sending(): void
    {
        config(['mail.preview.enabled' => true]);
        $directory = storage_path('framework/testing/mail-preview-'.uniqid('', true));

        $this->artisan('mutqin:mail-preview', [
            'template' => 'all',
            '--locale' => 'en',
            '--write' => $directory,
        ])->assertSuccessful();

        $this->assertFileExists($directory.'/verify-en.html');
        $this->assertFileExists($directory.'/verify-en.txt');
        $this->assertFileExists($directory.'/reset-en.html');
        $this->assertFileExists($directory.'/reset-en.txt');

        $html = File::get($directory.'/verify-en.html');
        $this->assertStringContainsString(__('mail.verify_action'), $html);
        $this->assertStringContainsString('v:roundrect', $html);
        $this->assertStringContainsString(TransactionalMail::previewActionUrls()['verify'], $html);
        $this->assertStringNotContainsString('{{', $html);

        $this->assertSame(0, $this->sentMessageCount());

        File::deleteDirectory($directory);
    }

    public function test_command_send_requires_explicit_recipients(): void
    {
        config([
            'mail.preview.enabled' => true,
            'mail.preview.recipients' => [],
        ]);

        $this->artisan('mutqin:mail-preview', [
            'template' => 'verify',
            '--send' => true,
        ])->assertFailed()
            ->expectsOutputToContain('MAIL_PREVIEW_RECIPIENTS');

        $this->assertSame(0, $this->sentMessageCount());
    }

    public function test_command_can_send_samples_to_configured_recipients(): void
    {
        config([
            'mail.preview.enabled' => true,
            'mail.preview.recipients' => ['qa-gmail@example.com', 'qa-outlook@example.com'],
        ]);

        $this->artisan('mutqin:mail-preview', [
            'template' => 'verify',
            '--send' => true,
            '--locale' => 'en',
        ])->assertSuccessful();

        $messages = $this->sentMessages();
        $this->assertCount(1, $messages);

        $email = $messages->first()->getOriginalMessage();
        $to = array_map(static fn ($address) => $address->getAddress(), $email->getTo());
        $this->assertEqualsCanonicalizing([
            'qa-gmail@example.com',
            'qa-outlook@example.com',
        ], $to);
        $this->assertStringContainsString('preview', $email->getSubject());
        $this->assertStringContainsString(__('mail.verify_action'), $email->getHtmlBody());
    }

    public function test_preview_action_urls_are_not_live_auth_tokens(): void
    {
        $urls = TransactionalMail::previewActionUrls();

        $this->assertStringContainsString('/email/verify/0/preview', $urls['verify']);
        $this->assertStringContainsString('preview-token', $urls['reset']);
        $this->assertStringNotContainsString('signature=', $urls['verify']);
        $this->assertStringNotContainsString('signature=', $urls['reset']);
    }

    private function sentMessages()
    {
        return app('mailer')->getSymfonyTransport()->messages();
    }

    private function sentMessageCount(): int
    {
        return $this->sentMessages()->count();
    }
}
