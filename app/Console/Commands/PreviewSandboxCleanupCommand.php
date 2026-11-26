<?php

namespace App\Console\Commands;

use App\Services\Preview\PreviewSandboxService;
use Illuminate\Console\Command;

class PreviewSandboxCleanupCommand extends Command
{
    protected $signature = 'mutqin:preview-sandbox-cleanup';

    protected $description = 'Delete expired preview sandbox sessions (Group J1).';

    public function handle(PreviewSandboxService $sandboxes): int
    {
        $deleted = $sandboxes->expireStaleSessions();
        $this->info("Removed {$deleted} expired preview sandbox session(s).");

        return self::SUCCESS;
    }
}
