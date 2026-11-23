<?php

namespace App\Services\Parent;

use App\Models\User;
use Illuminate\Support\Carbon;

interface ParentLearningReportCollector
{
    /**
     * @return array<string, mixed>
     */
    public function collect(User $student, string $cadence, Carbon $from, Carbon $to): array;
}
