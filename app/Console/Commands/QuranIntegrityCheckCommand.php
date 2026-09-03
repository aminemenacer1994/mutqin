<?php

namespace App\Console\Commands;

use App\Support\QuranContentIntegrity;
use Illuminate\Console\Command;

class QuranIntegrityCheckCommand extends Command
{
    protected $signature = 'quran:integrity-check';

    protected $description = 'Fail when protected Qur\'an content or metadata diverges from pinned fixtures';

    public function handle(): int
    {
        $result = QuranContentIntegrity::runAll();
        if (! $result['ok']) {
            foreach ($result['errors'] as $error) {
                $this->error($error);
            }

            return self::FAILURE;
        }

        $this->info('Qur\'an content integrity OK (checksums, counts, boundaries, pins).');

        return self::SUCCESS;
    }
}
