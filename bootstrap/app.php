<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use App\Http\Middleware\SetLocale;

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

        $middleware->redirectUsersTo(static fn (Request $request): string => route('memorisation'));
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
