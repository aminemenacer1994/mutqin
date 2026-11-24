<?php

namespace App\Http\Controllers\Auth;

use App\Enums\OrganisationType;
use App\Http\Controllers\Controller;
use App\Services\Organisations\OrganisationRegistry;
use App\Support\Registration\OrganisationRegistrationCatalog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RegistrationOrganisationController extends Controller
{
    public function __construct()
    {
        $this->middleware('guest');
    }

    public function index(Request $request, OrganisationRegistry $organisations): JsonResponse
    {
        $typeRaw = (string) $request->query('type', '');
        $query = (string) $request->query('q', '');
        $type = OrganisationType::tryFrom($typeRaw);

        if ($query !== '' || $type !== null) {
            return response()->json([
                'data' => $organisations->search($type, $query !== '' ? $query : null),
            ]);
        }

        return response()->json(['data' => OrganisationRegistrationCatalog::options()]);
    }
}
