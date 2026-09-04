<?php

namespace App\Console\Commands;

use App\Support\DatabaseDeploySafety;
use App\Support\TransactionalMail;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Mail;

class MailPreviewCommand extends Command
{
    protected $signature = 'mutqin:mail-preview
                            {template? : verify, reset, or all}
                            {--to=* : Recipient email (repeatable; or set MAIL_PREVIEW_RECIPIENTS)}
                            {--locale=en : Locale (en, fr, es)}
                            {--write= : Write HTML/text files instead of sending}
                            {--send : Send via the configured mailer (local/staging only)}';

    protected $description = 'Preview or send sample Mutqin transactional emails (local/staging only).';

    public function handle(): int
    {
        if (DatabaseDeploySafety::isProtectedEnvironment()) {
            $this->error('Refusing to run mail preview while APP_ENV is production.');

            return self::FAILURE;
        }

        if (! (bool) config('mail.preview.enabled', false)) {
            $this->error('Mail preview is locked. Add MAIL_PREVIEW_ENABLED=true to a local/staging .env, or run:');
            $this->line('  MAIL_PREVIEW_ENABLED=true php artisan mutqin:mail-preview');

            return self::FAILURE;
        }

        $template = strtolower(trim((string) $this->argument('template') ?: 'all'));
        $templates = $this->templates($template);
        if ($templates === []) {
            $this->error('Unknown template. Use verify, reset, or all.');

            return self::FAILURE;
        }

        $locale = strtolower(substr((string) $this->option('locale'), 0, 2));
        if (! in_array($locale, ['en', 'fr', 'es'], true)) {
            $this->error('Unsupported preview locale. Use en, fr, or es.');

            return self::FAILURE;
        }

        $send = (bool) $this->option('send');
        $writePath = $this->option('write');
        $writePath = is_string($writePath) && $writePath !== '' ? $writePath : null;

        if ($send && $writePath !== null) {
            $this->error('Use either --send or --write, not both.');

            return self::FAILURE;
        }

        if (! $send && $writePath === null) {
            $writePath = storage_path('app/mail-preview');
        }

        if ($send && ! $this->sendingMailerAllowed()) {
            $this->error('Refusing to send with MAIL_MAILER='.config('mail.default').'. Use resend or smtp for inbox tests.');

            return self::FAILURE;
        }

        $recipients = $send ? $this->recipients() : [];
        if ($send && $recipients === []) {
            $this->error('Pass --to=email or set MAIL_PREVIEW_RECIPIENTS. Test inboxes must not be hard-coded in app mail.');

            return self::FAILURE;
        }

        App::setLocale($locale);

        foreach ($templates as $name) {
            $rendered = $this->renderTemplate($name, $locale);

            if ($writePath !== null) {
                $this->writePreview($writePath, $name, $locale, $rendered);
            }

            if ($send) {
                $this->sendPreview($recipients, $rendered);
            }
        }

        if ($writePath !== null) {
            $this->info('Wrote preview files to '.$writePath);
        }

        if ($send) {
            $this->info('Sent '.count($templates).' sample email(s) to '.count($recipients).' recipient(s).');
        }

        return self::SUCCESS;
    }

    /**
     * @return list<string>
     */
    private function templates(string $template): array
    {
        if ($template === 'all') {
            return TransactionalMail::TEMPLATES;
        }

        return in_array($template, TransactionalMail::TEMPLATES, true) ? [$template] : [];
    }

    /**
     * @return list<string>
     */
    private function recipients(): array
    {
        $fromOptions = [];
        foreach ((array) $this->option('to') as $recipient) {
            $fromOptions[] = strtolower(trim((string) $recipient));
        }

        $emails = array_values(array_filter(
            $fromOptions !== [] && $fromOptions !== [''] ? $fromOptions : TransactionalMail::previewRecipients(),
            static fn (string $email): bool => $email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL) !== false
        ));

        return array_values(array_unique($emails));
    }

    private function sendingMailerAllowed(): bool
    {
        if (app()->environment('testing')) {
            return true;
        }

        return in_array((string) config('mail.default'), ['resend', 'smtp'], true);
    }

    /**
     * @return array{name: string, subject: string, html: string, text: string, data: array<string, mixed>}
     */
    private function renderTemplate(string $name, string $locale): array
    {
        $urls = TransactionalMail::previewActionUrls();
        $expireMinutes = $name === 'verify'
            ? (int) config('auth.verification.expire', 60)
            : (int) config('auth.passwords.'.config('auth.defaults.passwords').'.expire');

        $data = [
            'url' => $urls[$name],
            'userName' => 'Amine Preview With An Unusually Long Display Name',
            'expireMinutes' => $expireMinutes,
        ];

        $htmlView = $name === 'verify' ? 'mail.verify-email' : 'mail.reset-password';
        $textView = $name === 'verify' ? 'mail.text.verify-email' : 'mail.text.reset-password';
        $subjectKey = $name === 'verify' ? 'mail.verify_subject' : 'mail.reset_subject';

        return [
            'name' => $name,
            'subject' => '['.$locale.' preview] '.__($subjectKey),
            'html' => view($htmlView, $data)->render(),
            'text' => view($textView, $data)->render(),
            'data' => $data,
        ];
    }

    /**
     * @param  array{name: string, subject: string, html: string, text: string, data: array<string, mixed>}  $rendered
     */
    private function writePreview(string $directory, string $name, string $locale, array $rendered): void
    {
        File::ensureDirectoryExists($directory);
        File::put($directory.'/'.$name.'-'.$locale.'.html', $rendered['html']);
        File::put($directory.'/'.$name.'-'.$locale.'.txt', $rendered['text']);
    }

    /**
     * @param  list<string>  $recipients
     * @param  array{name: string, subject: string, html: string, text: string, data: array<string, mixed>}  $rendered
     */
    private function sendPreview(array $recipients, array $rendered): void
    {
        $htmlView = $rendered['name'] === 'verify' ? 'mail.verify-email' : 'mail.reset-password';
        $textView = $rendered['name'] === 'verify' ? 'mail.text.verify-email' : 'mail.text.reset-password';

        Mail::send(
            ['html' => $htmlView, 'text' => $textView],
            $rendered['data'],
            function ($message) use ($recipients, $rendered): void {
                $message->to($recipients)->subject($rendered['subject']);
            }
        );
    }
}
