<?php

namespace App\Http\Controllers\Parent;

use App\Http\Controllers\Controller;
use App\Support\ParentFeatures;
use Illuminate\Http\Request;
use Illuminate\View\View;

class LinkCodeController extends Controller
{
    public function show(Request $request): View
    {
        ParentFeatures::abortUnlessEnabled();
        abort_unless($request->user() !== null, 403);

        return view('parent.link-code', [
            'auth' => [
                'csrf_token' => csrf_token(),
                'api_url' => url('/api/parent'),
                'parent_features_enabled' => true,
            ],
        ]);
    }
}
