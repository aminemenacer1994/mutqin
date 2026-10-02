<?php

namespace App\Support;

/**
 * Common throwaway / disposable inbox domains (not exhaustive — blocks obvious abuse).
 */
final class DisposableEmailDomains
{
    /** @var list<string> */
    private const DOMAINS = [
        '10minutemail.com',
        '10minutemail.net',
        'dispostable.com',
        'dropmail.me',
        'emailondeck.com',
        'fakeinbox.com',
        'getnada.com',
        'grr.la',
        'guerrillamail.biz',
        'guerrillamail.com',
        'guerrillamail.de',
        'guerrillamail.net',
        'guerrillamail.org',
        'guerrillamailblock.com',
        'maildrop.cc',
        'mailinator.com',
        'mailinator.net',
        'mailinator.org',
        'mailnesia.com',
        'mailnull.com',
        'mintemail.com',
        'mohmal.com',
        'mytemp.email',
        'sharklasers.com',
        'spam4.me',
        'temp-mail.org',
        'tempmail.com',
        'tempmail.net',
        'tempmailo.com',
        'throwaway.email',
        'trashmail.com',
        'trashmail.de',
        'trashmail.net',
        'yopmail.com',
        'yopmail.fr',
        'yopmail.net',
    ];

    public static function isDisposable(string $domain): bool
    {
        $domain = strtolower(trim($domain));
        if ($domain === '') {
            return true;
        }

        foreach (self::DOMAINS as $blocked) {
            if ($domain === $blocked || str_ends_with($domain, '.'.$blocked)) {
                return true;
            }
        }

        return false;
    }
}
