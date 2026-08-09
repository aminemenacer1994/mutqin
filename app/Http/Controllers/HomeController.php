<?php

namespace App\Http\Controllers;

use App\Support\AuthRedirect;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class HomeController extends Controller
{
    /**
     * Create a new controller instance.
     *
     * @return void
     */
    public function __construct()
    {
        $this->middleware('auth');
    }

    /**
     * Role-aware post-auth home redirect.
     */
    public function index(Request $request): RedirectResponse
    {
        return redirect()->to(AuthRedirect::to($request->user()));
    }
}
