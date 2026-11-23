<?php

namespace App\Http\Controllers;

use App\Enums\PlatformContext;
use App\Models\User;
use App\Support\PlatformContextResolver;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PlatformSwitchController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user instanceof User, 403);

        $data = $request->validate([
            'platform' => ['required', 'string', Rule::in(PlatformContext::values())],
        ]);

        $context = PlatformContext::from($data['platform']);
        abort_unless(PlatformContextResolver::userCanUsePlatform($user, $context), 403);

        PlatformContextResolver::set($request, $context);

        $urls = PlatformContextResolver::routeUrls($user);
        $target = $urls[$context->value] ?? route('memorisation');

        return redirect()->to($target);
    }
}
