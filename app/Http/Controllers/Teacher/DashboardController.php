<?php

namespace App\Http\Controllers\Teacher;

use App\Http\Controllers\Controller;
use App\Support\TeacherFeatures;
use Illuminate\Http\Request;
use Illuminate\View\View;

class DashboardController extends Controller
{
    public function index(Request $request): View
    {
        TeacherFeatures::abortUnlessEnabled();

        $user = $request->user();
        abort_unless($user !== null && $user->isTeacher(), 403);

        return view('teacher.dashboard', [
            'auth' => [
                'id' => (int) $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'teacher_features_enabled' => true,
                'csrf_token' => csrf_token(),
                'api_url' => url('/api/teacher'),
                'practice_url' => route('dashboard'),
                'memorisation_url' => route('memorisation'),
                'profile_url' => route('profile.show'),
            ],
        ]);
    }
}
