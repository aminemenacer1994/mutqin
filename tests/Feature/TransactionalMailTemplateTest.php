<?php

namespace Tests\Feature;

use App\Models\User;
use App\Notifications\ResetPassword;
use App\Notifications\VerifyEmail;
use App\Support\TransactionalMail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\App;
use Tests\TestCase;

class TransactionalMailTemplateTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_preferred_locale_normalizes_supported_values(): void
    {
        $user = User::factory()->make(['locale' => 'fr']);
        $this->assertSame('fr', $user->preferredLocale());

        $fallback = User::factory()->make(['locale' => 'zz']);
        $this->assertSame('en', $fallback->preferredLocale());
    }

    public function test_verification_and_reset_html_share_the_branded_shell(): void
    {
        $user = User::factory()->unverified()->create([
            'name' => 'Jonathan Christopher Wellington-Smythe III',
            'email' => 'layout-check@example.com',
        ]);

        $verify = (new VerifyEmail)->toMail($user);
        $reset = (new ResetPassword('test-reset-token'))->toMail($user);

        $verifyHtml = (string) (new VerifyEmail)->toMail($user)->render();
        $resetHtml = (string) (new ResetPassword('test-reset-token'))->toMail($user)->render();
        $verifyText = view('mail.text.verify-email', $verify->viewData)->render();
        $resetText = view('mail.text.reset-password', $reset->viewData)->render();

        foreach ([$verifyHtml, $resetHtml] as $html) {
            $this->assertStringNotContainsString('{{', $html);
            $this->assertStringNotContainsString('@yield', $html);
            $this->assertStringNotContainsString('@section', $html);
            $this->assertStringNotContainsString('<script', $html);
            $this->assertStringNotContainsString('display:flex', $html);
            $this->assertStringNotContainsString('display:grid', $html);
            $this->assertStringContainsString('max-width:560px', $html);
            $this->assertStringContainsString('role="presentation"', $html);
            $this->assertStringContainsString('v:roundrect', $html);
            $this->assertStringContainsString('prefers-color-scheme', $html);
            $this->assertTrue(
                str_contains($html, 'cid:') || str_contains($html, 'data:image/png;base64,'),
                'Expected inline embedded logo in transactional mail HTML.'
            );
            $this->assertStringContainsString('#1f6b4f', $html);
            $this->assertStringContainsString(e(__('mail.tagline')), $html);
            $this->assertStringContainsString(TransactionalMail::brandName(), $html);
        }

        $this->assertStringContainsString(__('mail.verify_preheader', ['minutes' => $verify->viewData['expireMinutes']]), $verifyHtml);
        $this->assertStringContainsString(__('mail.verify_heading'), $verifyHtml);
        $this->assertStringContainsString(__('mail.verify_action'), $verifyHtml);
        $this->assertStringContainsString(e($verify->viewData['url']), $verifyHtml);
        $this->assertStringContainsString((string) $verify->viewData['expireMinutes'], $verifyHtml);
        $this->assertStringContainsString(e(__('mail.verify_security')), $verifyHtml);

        $this->assertStringContainsString(__('mail.reset_preheader', ['minutes' => $reset->viewData['expireMinutes']]), $resetHtml);
        $this->assertStringContainsString(__('mail.reset_heading'), $resetHtml);
        $this->assertStringContainsString(__('mail.reset_action'), $resetHtml);
        $this->assertStringContainsString(__('mail.reset_steps_title'), $resetHtml);
        $this->assertStringContainsString(e($reset->viewData['url']), $resetHtml);
        $this->assertStringContainsString(e(__('mail.reset_security')), $resetHtml);
        $this->assertSame(1, preg_match_all('/<a[^>]*href="'.preg_quote(e($reset->viewData['url']), '/').'"/', $resetHtml));
        $this->assertSame(1, preg_match_all('/<a[^>]*href="'.preg_quote(e($verify->viewData['url']), '/').'"/', $verifyHtml));

        $this->assertStringContainsString($verify->viewData['url'], $verifyText);
        $this->assertStringContainsString($reset->viewData['url'], $resetText);
        $this->assertStringContainsString(__('mail.verify_heading'), $verifyText);
        $this->assertStringContainsString(__('mail.reset_heading'), $resetText);
        $this->assertStringContainsString(__('mail.reset_security'), $resetText);
        $this->assertStringNotContainsString('&#039;', $resetText);
        $this->assertStringContainsString('mutqin.ai', $resetText);
    }

    public function test_french_and_spanish_mail_copy_renders_in_the_same_templates(): void
    {
        $user = User::factory()->create([
            'name' => 'Amine',
            'locale' => 'fr',
        ]);

        App::setLocale('fr');
        $frHtml = view('mail.verify-email', [
            'url' => 'https://app.mutqin.ai/email/verify/0/preview',
            'userName' => $user->name,
            'expireMinutes' => 60,
        ])->render();
        $this->assertStringContainsString(e(__('mail.verify_action')), $frHtml);
        $this->assertStringContainsString(e(__('mail.verify_heading')), $frHtml);

        App::setLocale('es');
        $esHtml = view('mail.reset-password', [
            'url' => 'https://app.mutqin.ai/password/reset/preview-token?email=preview%40example.com',
            'userName' => $user->name,
            'expireMinutes' => 60,
        ])->render();
        $this->assertStringContainsString(e(__('mail.reset_action')), $esHtml);
        $this->assertStringContainsString(e(__('mail.reset_heading')), $esHtml);

        $enKeys = array_keys(require lang_path('en/mail.php'));
        $this->assertSame($enKeys, array_keys(require lang_path('fr/mail.php')));
        $this->assertSame($enKeys, array_keys(require lang_path('es/mail.php')));
    }

    public function test_verification_mail_uses_the_notifiable_locale(): void
    {
        $user = User::factory()->unverified()->create([
            'name' => 'Amine',
            'locale' => 'fr',
        ]);

        $mail = (new VerifyEmail)->toMail($user);

        $this->assertSame(__('mail.verify_subject', [], 'fr'), $mail->subject);
        $this->assertSame('fr', TransactionalMail::localeFor($user));
    }

    public function test_production_notifications_do_not_hard_code_preview_inboxes(): void
    {
        $this->assertSame([], config('mail.preview.recipients'));
        $this->assertFalse((bool) config('mail.preview.enabled'));

        foreach ([
            app_path('Notifications/VerifyEmail.php'),
            app_path('Notifications/ResetPassword.php'),
            app_path('Models/User.php'),
        ] as $path) {
            $source = file_get_contents($path);
            $this->assertIsString($source);
            $this->assertStringNotContainsString('menacer72@gmail.com', $source);
            $this->assertStringNotContainsString('med_amine-jsk@hotmail.com', $source);
        }
    }

    public function test_logo_url_is_absolute_and_https_for_public_hosts(): void
    {
        config([
            'app.url' => 'http://localhost',
            'mail.brand.logo_url' => null,
            'mail.brand.asset_url' => 'https://app.mutqin.ai',
        ]);
        $this->assertSame('https://app.mutqin.ai/images/logo_email.png', TransactionalMail::logoUrl());

        config([
            'app.url' => 'http://app.mutqin.ai',
            'mail.brand.logo_url' => null,
        ]);

        $this->assertSame('https://app.mutqin.ai/images/logo_email.png', TransactionalMail::logoUrl());

        config(['mail.brand.logo_url' => 'https://app.mutqin.ai/images/logo_email.png']);
        $this->assertSame('https://app.mutqin.ai/images/logo_email.png', TransactionalMail::logoUrl());
    }
}
