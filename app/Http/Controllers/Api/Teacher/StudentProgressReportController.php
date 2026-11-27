<?php

namespace App\Http\Controllers\Api\Teacher;

use App\Http\Controllers\Controller;
use App\Models\StudentProgressReport;
use App\Models\User;
use App\Services\Reports\StudentProgressReportExporter;
use App\Services\Reports\StudentProgressReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class StudentProgressReportController extends Controller
{
    public function index(Request $request, User $student, StudentProgressReportService $reports): JsonResponse
    {
        return response()->json([
            'reports' => $reports->index($this->teacher($request), $student),
        ]);
    }

    public function store(Request $request, User $student, StudentProgressReportService $reports): JsonResponse
    {
        $data = $request->validate([
            'period_type' => ['nullable', 'in:week,month,custom'],
            'from' => ['nullable', 'date_format:Y-m-d'],
            'to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:from'],
            'cadence' => ['nullable', 'date'],
        ]);

        $report = $reports->createOrRefreshDraft($this->teacher($request), $student, $data);

        return response()->json([
            'report' => $reports->show($this->teacher($request), $report),
        ], 201);
    }

    public function show(Request $request, StudentProgressReport $report, StudentProgressReportService $reports): JsonResponse
    {
        return response()->json([
            'report' => $reports->show($this->teacher($request), $report),
            'pdf_supported' => true,
        ]);
    }

    public function update(Request $request, StudentProgressReport $report, StudentProgressReportService $reports): JsonResponse
    {
        $data = $request->validate([
            'teacher_notes' => ['nullable', 'string', 'max:4000'],
        ]);

        $report = $reports->updateDraftNotes($this->teacher($request), $report, $data['teacher_notes'] ?? null);

        return response()->json([
            'report' => $reports->show($this->teacher($request), $report),
        ]);
    }

    public function refresh(Request $request, StudentProgressReport $report, StudentProgressReportService $reports): JsonResponse
    {
        $report = $reports->refreshDraft($this->teacher($request), $report);

        return response()->json([
            'report' => $reports->show($this->teacher($request), $report),
        ]);
    }

    public function approve(Request $request, StudentProgressReport $report, StudentProgressReportService $reports): JsonResponse
    {
        $data = $request->validate([
            'share_with_parents' => ['sometimes', 'boolean'],
        ]);

        $approved = $reports->approve(
            $this->teacher($request),
            $report,
            (bool) ($data['share_with_parents'] ?? true),
        );

        return response()->json([
            'report' => $reports->show($this->teacher($request), $approved),
        ]);
    }

    public function download(
        Request $request,
        StudentProgressReport $report,
        StudentProgressReportService $reports,
        StudentProgressReportExporter $exporter,
    ): Response {
        $presented = $reports->show($this->teacher($request), $report);

        return response($exporter->pdf($presented), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="'.$exporter->filename($presented).'"',
        ]);
    }

    private function teacher(Request $request): User
    {
        $user = $request->user();
        abort_unless($user instanceof User && $user->isTeacher(), 403);

        return $user;
    }
}