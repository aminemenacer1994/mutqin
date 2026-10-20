<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Support\Registration\OrganisationRegistrationCatalog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RegistrationOrganisationController extends Controller
{
    public function __construct()
    {
        $this->middleware('guest');
    }

    public function index(Request $request): JsonResponse
    {
        $type = (string) $request->query('type', '');
        $options = OrganisationRegistrationCatalog::options();

        if ($type !== '') {
            $options = array_values(array_filter(
                $options,
                fn (array $row) => $row['type'] === $type,
            ));
        }

        return response()->json(['data' => $options]);
    }
}
