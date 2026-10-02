<?php

namespace App\Rules;

use App\Support\DisposableEmailDomains;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Support\Str;

class WaitingListEmail implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value)) {
            $fail(__('ui.waiting_list_email_invalid'));

            return;
        }

        $email = strtolower(trim($value));
        if ($email === '' || ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $fail(__('ui.waiting_list_email_invalid'));

            return;
        }

        if (! str_contains($email, '@')) {
            $fail(__('ui.waiting_list_email_invalid'));

            return;
        }

        $domain = Str::afterLast($email, '@');
        if ($domain === '' || ! str_contains($domain, '.')) {
            $fail(__('ui.waiting_list_email_invalid'));

            return;
        }

        if (DisposableEmailDomains::isDisposable($domain)) {
            $fail(__('ui.waiting_list_email_disposable'));

            return;
        }

        if ($this->shouldVerifyMailDomain() && ! $this->domainAcceptsMail($domain)) {
            $fail(__('ui.waiting_list_email_unreachable'));
        }
    }

    private function shouldVerifyMailDomain(): bool
    {
        if (app()->runningUnitTests()) {
            return false;
        }

        return ! filter_var(config('mutqin.waiting_list.skip_mail_domain_dns_check'), FILTER_VALIDATE_BOOL);
    }

    private function domainAcceptsMail(string $domain): bool
    {
        if (function_exists('checkdnsrr') && checkdnsrr($domain, 'MX')) {
            return true;
        }

        if (function_exists('checkdnsrr') && checkdnsrr($domain, 'A')) {
            return true;
        }

        return false;
    }
}
