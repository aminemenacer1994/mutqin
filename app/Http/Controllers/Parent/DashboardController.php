<?php

namespace App\Http\Controllers\Parent;

use App\Http\Controllers\Controller;
use App\Support\ParentFeatures;
use App\Support\PlatformContextResolver;
use Illuminate\Http\Request;
use Illuminate\View\View;

class DashboardController extends Controller
{
    public function index(Request $request): View
    {
        ParentFeatures::abortUnlessEnabled();

        $user = $request->user();
        abort_unless($user !== null && $user->isParent(), 403);

        $platforms = PlatformContextResolver::routeUrls($user);

        return view('parent.dashboard', [
            'auth' => [
                'id' => (int) $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'parent_features_enabled' => true,
                'csrf_token' => csrf_token(),
                'api_url' => url('/api/parent'),
                'memorisation_url' => route('memorisation'),
                'teacher_dashboard_url' => $platforms['teacher'] ?? null,
                'parent_dashboard_url' => route('parent.dashboard'),
                'practice_url' => route('dashboard'),
                'profile_url' => route('profile.show'),
                'platform_switch_url' => route('platform.switch'),
                'available_platforms' => collect($platforms)
                    ->filter()
                    ->map(static fn (?string $url, string $id): array => ['id' => $id, 'url' => (string) $url])
                    ->values()
                    ->all(),
            ],
        ]);
    }
}
