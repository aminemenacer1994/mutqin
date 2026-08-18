<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use App\Http\Middleware\EnsureSubscriptionTier;
use App\Http\Middleware\LogMutqinApiRequest;
use App\Http\Middleware\SetLocale;
use App\Models\User;
use App\Support\AuthRedirect;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->encryptCookies(except: [
            'mutqin_locale',
        ]);

        $middleware->web(append: [
            SetLocale::class,
        ]);

        // Enable Sanctum SPA (cookie-based) authentication for the API routes so
        // the existing session login keeps working without issuing API tokens.
        $middleware->statefulApi();

        $middleware->api(prepend: [
            LogMutqinApiRequest::class,
        ]);

        $middleware->alias([
            'plan' => EnsureSubscriptionTier::class,
        ]);

        $middleware->redirectUsersTo(static function (Request $request): string {
            $user = $request->user();

            return AuthRedirect::to($user instanceof User ? $user : null);
        });
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Keep API clients on friendly JSON; never leak exception internals when debug is off.
        $exceptions->shouldRenderJsonWhen(static function (Request $request, \Throwable $e): bool {
            return $request->is('api/*') || $request->expectsJson();
        });
    })->create();
