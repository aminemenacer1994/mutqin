<?php

namespace App\Support;

use Illuminate\Support\Facades\URL;

/**
 * Keep generated URLs on the public APP_URL origin in deployed environments.
 */
final class PublicAppUrl
{
    public static function apply(?string $appUrl = null, ?string $environment = null): void
    {
        $appUrl = rtrim((string) ($appUrl ?? config('app.url')), '/');
        $host = parse_url($appUrl, PHP_URL_HOST) ?: '';
        $loopback = GoogleOAuthRedirect::isLoopbackHost(is_string($host) ? $host : '');
        $environment ??= app()->environment();

        $pinToAppUrl = (function_exists('laravel_cloud') && laravel_cloud())
            || (! in_array($environment, ['local', 'testing'], true) && $host !== '' && ! $loopback);

        if ($pinToAppUrl) {
            URL::forceRootUrl($appUrl);
        }

        if (($pinToAppUrl || str_starts_with($appUrl, 'https://')) && ! $loopback) {
            URL::forceHttps();
        }
    }
}
