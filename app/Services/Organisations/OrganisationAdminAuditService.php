<?php

namespace App\Services\Organisations;

use App\Models\Organisation;
use App\Models\OrganisationAdminAuditLog;
use App\Models\User;
use Illuminate\Http\Request;

class OrganisationAdminAuditService
{
    public function record(
        Organisation $organisation,
        User $actor,
        string $action,
        ?string $subjectType = null,
        ?int $subjectId = null,
        ?array $metadata = null,
        ?Request $request = null,
    ): void {
        OrganisationAdminAuditLog::query()->create([
            'organisation_id' => $organisation->id,
            'actor_user_id' => $actor->id,
            'action' => $action,
            'subject_type' => $subjectType,
            'subject_id' => $subjectId,
            'metadata' => $metadata,
            'ip_address' => $request?->ip(),
            'created_at' => now(),
        ]);
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function recent(Organisation $organisation, int $limit = 40): array
    {
        return OrganisationAdminAuditLog::query()
            ->with('actor:id,name')
            ->where('organisation_id', $organisation->id)
            ->orderByDesc('id')
            ->limit(max(1, min($limit, 100)))
            ->get()
            ->map(fn (OrganisationAdminAuditLog $row) => [
                'id' => (int) $row->id,
                'action' => $row->action,
                'subject_type' => $row->subject_type,
                'subject_id' => $row->subject_id !== null ? (int) $row->subject_id : null,
                'metadata' => $row->metadata,
                'actor' => $row->actor?->only(['id', 'name']),
                'at' => $row->created_at?->toIso8601String(),
            ])
            ->values()
            ->all();
    }
}