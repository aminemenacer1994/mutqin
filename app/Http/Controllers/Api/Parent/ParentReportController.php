<?php

namespace App\Http\Controllers\Api\Parent;

use App\Http\Controllers\Controller;
use App\Models\ParentLearningReport;
use App\Models\User;
use App\Services\Parent\ParentLearningReportReader;
use App\Support\ParentFeatures;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class ParentReportController extends Controller
{
    public function index(Request $request, ParentLearningReportReader $reports): JsonResponse
    {
        $data = $request->validate([
            'cadence' => ['nullable', 'in:week,month'],
            'child_id' => ['nullable', 'integer'],
        ]);

        return response()->json($reports->index(
            $this->parent($request),
            (string) ($data['cadence'] ?? 'week'),
            isset($data['child_id']) ? (int) $data['child_id'] : null,
        ));
    }

    public function show(Request $request, ParentLearningReport $report, ParentLearningReportReader $reports): JsonResponse
    {
        return response()->json([
            'report' => $reports->show($this->parent($request), $report),
            'pdf_supported' => false,
        ]);
    }

    public function download(Request $request, ParentLearningReport $report, ParentLearningReportReader $reports): Response
    {
        $presented = $reports->show($this->parent($request), $report);
        $filename = 'mutqin-learning-report-'.$presented['period_start'].'.html';

        return response()
            ->view('parent.learning-report', ['report' => $presented])
            ->header('Content-Disposition', 'attachment; filename="'.$filename.'"');
    }

    private function parent(Request $request): User
    {
        ParentFeatures::abortUnlessEnabled();
        $user = $request->user();
        abort_unless($user instanceof User && $user->isParent(), 403);

        return $user;
    }
}
