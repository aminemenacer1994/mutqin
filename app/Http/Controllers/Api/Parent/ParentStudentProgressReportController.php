<?php

namespace App\Http\Controllers\Api\Parent;

use App\Enums\StudentProgressReportStatus;
use App\Http\Controllers\Controller;
use App\Models\StudentProgressReport;
use App\Models\User;
use App\Services\Parent\ParentAccessAuthorizer;
use App\Services\Reports\StudentProgressReportExporter;
use App\Services\Reports\StudentProgressReportService;
use App\Support\ParentFeatures;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class ParentStudentProgressReportController extends Controller
{
    public function index(Request $request, ParentAccessAuthorizer $access): JsonResponse
    {
        $parent = $this->parent($request);
        $data = $request->validate([
            'child_id' => ['required', 'integer'],
        ]);
        $childId = (int) $data['child_id'];
        $child = User::query()->findOrFail($childId);
        abort_unless($access->allows($parent, $child), 404);

        $reports = StudentProgressReport::query()
            ->where('student_user_id', $child->id)
            ->where('status', StudentProgressReportStatus::Approved->value)
            ->where('shared_with_parents', true)
            ->orderByDesc('approved_at')
            ->limit(12)
            ->get()
            ->map(fn (StudentProgressReport $report) => [
                'id' => (int) $report->id,
                'period_label' => $report->period_start->format('j M').' – '.$report->period_end->format('j M Y'),
                'period_start' => $report->period_start->toDateString(),
                'period_end' => $report->period_end->toDateString(),
                'approved_at' => $report->approved_at?->toIso8601String(),
                'kind' => 'teacher_approved',
            ])
            ->values()
            ->all();

        return response()->json([
            'reports' => $reports,
            'pdf_supported' => true,
        ]);
    }

    public function show(Request $request, StudentProgressReport $report, StudentProgressReportService $reports): JsonResponse
    {
        return response()->json([
            'report' => $reports->presentForParent($this->parent($request), $report),
            'pdf_supported' => true,
        ]);
    }

    public function download(
        Request $request,
        StudentProgressReport $report,
        StudentProgressReportService $reports,
        StudentProgressReportExporter $exporter,
    ): Response {
        $presented = $reports->presentForParent($this->parent($request), $report);

        return response($exporter->pdf($presented), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="'.$exporter->filename($presented).'"',
        ]);
    }

    private function parent(Request $request): User
    {
        ParentFeatures::abortUnlessEnabled();
        $user = $request->user();
        abort_unless($user instanceof User && $user->isParent(), 403);

        return $user;
    }
}