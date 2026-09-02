<?php

namespace App\Support;

use App\Exceptions\ErrorTrackingProbeException;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\Request;
use Illuminate\Session\TokenMismatchException;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Sentry\Event as SentryEvent;
use Sentry\EventHint;
use Sentry\SentrySdk;
use Sentry\Severity;
use Sentry\State\Scope;
use Sentry\UserDataBag;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Throwable;

class ErrorReporting
{
    /**
     * @var array<string, true>
     */
    private static array $reported = [];

    public static function release(): string
    {
        $configured = trim((string) (
            config('error_tracking.release')
            ?: config('sentry.release')
            ?: ''
        ));

        if ($configured !== '') {
            return $configured;
        }

        return trim((string) config('error_tracking.asset_build', 'dev')) ?: 'dev';
    }

    public static function requestId(?Request $request = null): ?string
    {
        $request ??= self::currentRequest();
        if (! $request) {
            return null;
        }

        $id = $request->attributes->get('mutqin.request_id')
            ?: $request->headers->get('X-Request-Id');

        return is_string($id) && $id !== '' ? $id : null;
    }

    public static function featureFromRequest(?Request $request = null): string
    {
        $request ??= self::currentRequest();

        return self::featureFromPath($request?->path() ?? '');
    }

    public static function featureFromPath(string $path): string
    {
        $path = strtolower(trim($path, '/'));

        return match (true) {
            str_contains($path, 'transcription-token'), str_contains($path, 'speechmatics') => 'speechmatics',
            str_contains($path, 'quran-proxy'), str_contains($path, 'quran/') => 'quran',
            str_contains($path, 'memorisation') => 'memorisation',
            str_contains($path, 'session') => 'session',
            str_contains($path, 'stripe'), str_contains($path, 'billing') => 'billing',
            str_contains($path, 'admin') => 'admin',
            str_contains($path, 'login'), str_contains($path, 'register'), str_contains($path, 'auth') => 'auth',
            str_contains($path, 'dashboard') => 'dashboard',
            str_contains($path, 'client-errors'), str_contains($path, 'error-test') => 'error_tracking',
            str_contains($path, 'health'), str_contains($path, 'alert-test') => 'monitoring',
            default => 'app',
        };
    }

    public static function shouldIgnore(Throwable $e): bool
    {
        if ($e instanceof ErrorTrackingProbeException) {
            return false;
        }

        if ($e instanceof ValidationException
            || $e instanceof AuthenticationException
            || $e instanceof AuthorizationException
            || $e instanceof TokenMismatchException
            || $e instanceof ModelNotFoundException) {
            return true;
        }

        if ($e instanceof HttpExceptionInterface) {
            return $e->getStatusCode() < 500;
        }

        return false;
    }

    /**
     * Called from Laravel's reportable hook after an exception is accepted for reporting.
     * Enriches Sentry (same provider) and writes one structured log. Does not capture
     * again — sentry-laravel already listens to Laravel's reporter.
     */
    public static function handleReported(Throwable $e): void
    {
        if (self::alreadyRecorded($e, 'exception')) {
            return;
        }

        $context = self::exceptionContext($e);
        MutqinLog::error('exception.reported', $context);
        self::enrichSentryScope($context);
    }

    /**
     * @param  array<string, mixed>  $context
     */
    public static function reportProviderFailure(string $provider, array $context = []): void
    {
        $fingerprint = implode('|', [
            'provider',
            $provider,
            (string) ($context['status'] ?? ''),
            (string) ($context['reason'] ?? ''),
            self::requestId() ?? 'none',
        ]);

        if (self::alreadyRecorded($fingerprint, 'provider')) {
            return;
        }

        $payload = SensitiveDataRedactor::redact(array_merge(self::baseContext([
            'feature' => $context['feature'] ?? self::featureFromRequest(),
            'provider' => $provider,
        ]), $context, [
            'kind' => 'provider_failure',
        ]));

        MutqinLog::warning('provider.request.failed', $payload);

        if (! self::sentryEnabled()) {
            return;
        }

        \Sentry\withScope(function (Scope $scope) use ($payload): void {
            self::applyScope($scope, $payload);
            \Sentry\captureMessage(
                'Provider request failed: '.((string) ($payload['provider'] ?? 'unknown')),
                Severity::warning()
            );
        });
    }

    /**
     * Frontend / client events already sanitized by the ingest controller.
     *
     * @param  array<string, mixed>  $payload
     */
    public static function reportClientEvent(array $payload): void
    {
        $fingerprint = implode('|', [
            'client',
            (string) ($payload['kind'] ?? ''),
            (string) ($payload['name'] ?? ''),
            (string) ($payload['message'] ?? ''),
            (string) ($payload['feature'] ?? ''),
            (string) ($payload['request_id'] ?? self::requestId() ?? 'none'),
        ]);

        if (self::alreadyRecorded($fingerprint, 'client')) {
            return;
        }

        $context = SensitiveDataRedactor::redact(array_merge(self::baseContext([
            'feature' => $payload['feature'] ?? 'app',
            'layer' => 'frontend',
        ]), $payload));

        MutqinLog::error('client.exception.reported', $context);

        if (! self::sentryEnabled()) {
            return;
        }

        \Sentry\withScope(function (Scope $scope) use ($context): void {
            self::applyScope($scope, $context);
            $scope->setTag('layer', 'frontend');
            \Sentry\captureMessage(
                (string) ($context['name'] ?? $context['kind'] ?? 'ClientError'),
                Severity::error()
            );
        });
    }

    /**
     * Last-line scrub before an event leaves the process. Callable must be
     * serializable for `config:cache`.
     */
    public static function beforeSend(SentryEvent $event, ?EventHint $hint = null): ?SentryEvent
    {
        unset($hint);

        $user = $event->getUser();
        if ($user instanceof UserDataBag && $user->getId() !== null) {
            $event->setUser(UserDataBag::createFromUserIdentifier($user->getId()));
        } else {
            $event->setUser(null);
        }

        $event->setRequest(SensitiveDataRedactor::redact($event->getRequest()));
        $event->setExtra(SensitiveDataRedactor::redact($event->getExtra()));

        foreach ($event->getContexts() as $name => $context) {
            if (! is_array($context)) {
                continue;
            }
            $event->setContext((string) $name, SensitiveDataRedactor::redact($context));
        }

        return $event;
    }

    public static function decorateResponse(Response $response): Response
    {
        $requestId = self::requestId();
        if ($requestId && ! $response->headers->has('X-Request-Id')) {
            $response->headers->set('X-Request-Id', $requestId);
        }

        return $response;
    }

    /**
     * @return array<string, mixed>
     */
    public static function baseContext(array $extra = []): array
    {
        $request = self::currentRequest();
        $userId = $request?->user()?->id;

        return array_filter(array_merge([
            'environment' => app()->environment(),
            'release' => self::release(),
            'request_id' => self::requestId($request),
            'route' => $request?->route()?->getName() ?: $request?->path(),
            'method' => $request?->method(),
            'feature' => self::featureFromRequest($request),
            'user_id' => $userId,
            'layer' => 'backend',
        ], $extra), static fn (mixed $value): bool => $value !== null && $value !== '');
    }

    public static function sentryEnabled(): bool
    {
        if (! class_exists(SentrySdk::class) || ! function_exists('\\Sentry\\configureScope')) {
            return false;
        }

        $dsn = trim((string) config('sentry.dsn', ''));

        return $dsn !== '' && app()->bound('sentry');
    }

    public static function probeAllowed(?Request $request = null): bool
    {
        if (! config('error_tracking.probe_enabled', true)) {
            return false;
        }

        if (! app()->environment('production')) {
            return true;
        }

        $request ??= self::currentRequest();
        $user = $request?->user();

        return $user instanceof User && $user->isAdmin();
    }

    /**
     * @return array<string, mixed>
     */
    private static function exceptionContext(Throwable $e): array
    {
        return SensitiveDataRedactor::redact(self::baseContext([
            'kind' => 'exception',
            'exception_class' => $e::class,
            'message' => SensitiveDataRedactor::redactString($e->getMessage(), 300),
            'status' => $e instanceof HttpExceptionInterface ? $e->getStatusCode() : null,
            'probe' => $e instanceof ErrorTrackingProbeException,
        ]));
    }

    /**
     * @param  array<string, mixed>  $context
     */
    private static function enrichSentryScope(array $context): void
    {
        if (! self::sentryEnabled()) {
            return;
        }

        \Sentry\configureScope(function (Scope $scope) use ($context): void {
            self::applyScope($scope, $context);
        });
    }

    /**
     * @param  array<string, mixed>  $context
     */
    private static function applyScope(Scope $scope, array $context): void
    {
        foreach (['request_id', 'feature', 'layer', 'provider', 'kind'] as $tag) {
            if (! empty($context[$tag]) && is_scalar($context[$tag])) {
                $scope->setTag($tag, (string) $context[$tag]);
            }
        }

        if (! empty($context['release'])) {
            $scope->setTag('release', (string) $context['release']);
        }

        if (! empty($context['user_id'])) {
            $scope->setUser(['id' => (string) $context['user_id']]);
        }

        $safeExtra = [];
        foreach (['status', 'latency_ms', 'reason', 'route', 'method', 'environment'] as $key) {
            if (array_key_exists($key, $context) && $context[$key] !== null && $context[$key] !== '') {
                $safeExtra[$key] = $context[$key];
            }
        }
        if ($safeExtra !== []) {
            $scope->setContext('mutqin', $safeExtra);
        }
    }

    private static function alreadyRecorded(Throwable|string $key, string $bucket): bool
    {
        $id = $key instanceof Throwable
            ? $bucket.'|'.spl_object_id($key).'|'.$key::class
            : $bucket.'|'.$key;

        if (isset(self::$reported[$id])) {
            return true;
        }

        self::$reported[$id] = true;

        if (count(self::$reported) > 200) {
            self::$reported = array_slice(self::$reported, -80, preserve_keys: true);
        }

        return false;
    }

    private static function currentRequest(): ?Request
    {
        if (! app()->bound('request')) {
            return null;
        }

        $request = request();

        return $request instanceof Request ? $request : null;
    }

    public static function isValidRequestId(?string $value): bool
    {
        if (! is_string($value) || $value === '') {
            return false;
        }

        return (bool) preg_match('/^[A-Za-z0-9._-]{8,80}$/', $value);
    }

    public static function newRequestId(): string
    {
        return (string) Str::uuid();
    }
}
