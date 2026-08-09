<?php

namespace App\Http\Controllers;

use App\Services\DashboardService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class DashboardController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth');
    }

    public function index(Request $request, DashboardService $dashboard): Response|RedirectResponse
    {
        $user = $request->user();

        // Admins have a dedicated console; keep the learner dashboard for non-admins only.
        if ($user->isAdmin()) {
            return redirect()->route('admin.dashboard');
        }

        $data = $dashboard->build($user, 30);

        return response()
            ->view('dashboard', [
                'dashboard' => $data,
                'dashboardAuth' => [
                    'check' => true,
                    'id' => (int) $user->id,
                    'email' => $user->email,
                    'name' => $user->name,
                    'first_name' => $data['welcome']['first_name'] ?? null,
                    'locale' => $user->locale ?? 'en',
                    'csrf_token' => csrf_token(),
                    'memorisation_url' => route('memorisation'),
                    'dashboard_api_url' => url('/api/dashboard'),
                    'login_url' => route('login'),
                ],
            ])
            ->header('Cache-Control', 'private, no-store, no-cache, must-revalidate');
    }
}
