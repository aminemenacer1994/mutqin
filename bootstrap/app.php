<?php

use App\Http\Controllers\WaitingListController;
use App\Http\Middleware\ApplySeoRobotsHeader;
use App\Http\Middleware\AssignRequestId;
use App\Http\Middleware\EnforceMarketingHostPolicy;
use App\Http\Middleware\EnsureSubscriptionTier;
use App\Http\Middleware\ForwardMarketingWaitingListSignup;
use App\Http\Middleware\LogMutqinApiRequest;
use App\Http\Middleware\NormalizeLocalDevelopmentHost;
use App\Http\Middleware\PreventStaleHtmlCache;
use App\Http\Middleware\RedirectTrailingSlash;
use App\Http\Middleware\RedirectWwwHost;
use App\Http\Middleware\SetLocale;
use App\Http\Middleware\SetMutqinContentSecurityPolicy;
use App\Models\User;
use App\Support\AuthRedirect;
use App\Support\ErrorReporting;
use App\Support\MutqinDomains;
use App\Support\Theme;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Routing\Exceptions\InvalidSignatureException;
use Illuminate\Session\TokenMismatchException;
use Illuminate\Support\Facades\Route;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        then: function (): void {
            // Public signup must not use web/api stacks — Sanctum treats
            // Origin mutqin.ai as stateful and CSRF-checks /api/* (419).
            Route::post('/join-waiting-list', [WaitingListController::class, 'store'])
                ->middleware([ForwardMarketingWaitingListSignup::class, 'throttle:5,1'])
                ->name('waiting-list.public-store');
            Route::post('/api/waiting-list', [WaitingListController::class, 'store'])
                ->middleware([ForwardMarketingWaitingListSignup::class, 'throttle:5,1'])
                ->name('api.waiting-list.store');

            Route::middleware('web')->group(function (): void {
                require base_path('routes/web/seo.php');

                if (MutqinDomains::hostRoutingEnabled()) {
                    Route::domain(MutqinDomains::marketingHost())
                        ->group(base_path('routes/web/marketing.php'));
                    Route::domain(MutqinDomains::appHost())
                        ->group(base_path('routes/web/app.php'));
                } else {
                    require base_path('routes/web/app.php');
                }
            });
        },
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Laravel Cloud (and any TLS terminator) forwards proto/host. Trust the
        // proxy so request()->isSecure() and URL generation stay on HTTPS.
        $middleware->trustProxies(at: '*');

        // JS writes these as plaintext; encrypting them makes reload drop the choice.
        $middleware->encryptCookies(except: [
            'mutqin_locale',
            Theme::COOKIE,
            Theme::CHOSEN_COOKIE,
        ]);

        $middleware->validateCsrfTokens(except: [
            'waiting-list',
            'api/waiting-list',
            'join-waiting-list',
        ]);

        $middleware->prepend([
            RedirectWwwHost::class,
            RedirectTrailingSlash::class,
        ]);

        $middleware->web(prepend: [
            AssignRequestId::class,
            EnforceMarketingHostPolicy::class,
            NormalizeLocalDevelopmentHost::class,
        ]);

        $middleware->web(append: [
            SetLocale::class,
            PreventStaleHtmlCache::class,
            ApplySeoRobotsHeader::class,
            SetMutqinContentSecurityPolicy::class,
        ]);

        // Enable Sanctum SPA (cookie-based) authentication for the API routes so
        // the existing session login keeps working without issuing API tokens.
        $middleware->statefulApi();

        $middleware->api(prepend: [
            AssignRequestId::class,
            LogMutqinApiRequest::class,
        ]);

        $middleware->api(append: [
            SetLocale::class,
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
        $exceptions->shouldRenderJsonWhen(static function (Request $request, Throwable $e): bool {
            return $request->is('api/*') || $request->expectsJson();
        });

        $exceptions->dontReportWhen(static function (Throwable $e): bool {
            return ErrorReporting::shouldIgnore($e);
        });

        $exceptions->reportable(static function (Throwable $e): void {
            ErrorReporting::handleReported($e);
        });

        $exceptions->respond(static function (Response $response): Response {
            return ErrorReporting::decorateResponse($response);
        });

        $exceptions->render(static function (Throwable $e, Request $request) {
            if ($e instanceof InvalidSignatureException
                && $request->routeIs('verification.verify')
                && ! $request->expectsJson()
            ) {
                $redirect = $request->user()
                    ? redirect()->route('verification.notice')
                    : redirect()->route('login');

                return $redirect->with('error', __('ui.verify_link_invalid'));
            }

            if ($e instanceof ValidationException
                || $e instanceof AuthenticationException
                || $e instanceof AuthorizationException
                || $e instanceof TokenMismatchException) {
                return null;
            }

            $status = $e instanceof HttpExceptionInterface ? $e->getStatusCode() : 500;
            if ($status < 500) {
                return null;
            }

            if (config('app.debug')) {
                return null;
            }

            if (! $request->is('api/*') && ! $request->expectsJson()) {
                return null;
            }

            return response()->json([
                'message' => __('ui.error_message'),
                'request_id' => ErrorReporting::requestId($request),
            ], $status);
        });
    })->create();
