<?php

namespace App\Http\Controllers\Api\Teacher;

use App\Http\Controllers\Controller;
use App\Models\MushafAnnotation;
use App\Models\User;
use App\Services\Teacher\MushafAnnotationService;
use App\Services\Teacher\TeacherWordCoachingAudioService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class TeacherMushafAnnotationController extends Controller
{
    public function index(Request $request, User $student, MushafAnnotationService $service): JsonResponse
    {
        $data = $request->validate([
            'context_type' => ['required', 'string', 'max:32'],
            'context_id' => ['nullable', 'integer', 'min:0'],
        ]);

        return response()->json([
            'annotations' => $service->manualContext(
                $this->teacher($request),
                $student,
                (string) $data['context_type'],
                (int) ($data['context_id'] ?? 0),
            ),
        ]);
    }

    public function store(Request $request, User $student, MushafAnnotationService $service): JsonResponse
    {
        $data = $request->validate([
            'context_type' => ['required', 'string', 'max:32'],
            'context_id' => ['nullable', 'integer', 'min:0'],
            'surah' => ['required', 'integer', 'min:1', 'max:114'],
            'ayah' => ['required', 'integer', 'min:1', 'max:300'],
            'word_index' => ['nullable', 'integer', 'min:0', 'max:400'],
            'granularity' => ['nullable', 'string', 'in:word,ayah'],
            'category' => ['required', 'string', 'max:24'],
            'severity' => ['nullable', 'string', 'max:16'],
            'structured_rule' => ['nullable', 'string', 'max:32'],
            'guidance' => ['nullable', 'string', 'max:2000'],
            'start_ms' => ['nullable', 'integer', 'min:0', 'max:3600000'],
            'end_ms' => ['nullable', 'integer', 'min:0', 'max:3600000'],
            'publish' => ['nullable', 'boolean'],
            'audio' => ['nullable', 'file', 'max:8192'],
            'duration_ms' => ['nullable', 'integer', 'between:1,120000'],
        ]);

        return response()->json(
            $service->store($this->teacher($request), $student, $data, $request->file('audio')),
            201,
        );
    }

    public function destroy(Request $request, User $student, MushafAnnotation $annotation, MushafAnnotationService $service): JsonResponse
    {
        $service->delete($this->teacher($request), $student, $annotation);

        return response()->json(['deleted' => true]);
    }

    public function audio(Request $request, MushafAnnotation $annotation, TeacherWordCoachingAudioService $audio): Response
    {
        abort_unless($annotation->audio_path && $annotation->audio_disk, 404);
        $user = $request->user();
        abort_unless($user instanceof User, 401);
        abort_unless(
            (int) $user->id === (int) $annotation->teacher_id
            || (int) $user->id === (int) $annotation->student_id,
            403,
        );

        $response = \Illuminate\Support\Facades\Storage::disk((string) $annotation->audio_disk)
            ->response((string) $annotation->audio_path);
        if ($annotation->audio_mime) {
            $response->headers->set('Content-Type', (string) $annotation->audio_mime);
        }

        return $response;
    }

    private function teacher(Request $request): User
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        return $user;
    }
}