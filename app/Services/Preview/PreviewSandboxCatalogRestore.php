<?php

namespace App\Services\Preview;

use App\Models\PreviewSandboxSession;
use App\Support\DatabaseDeploySafety;
use App\Support\LandingPreviewDemo;
use Illuminate\Support\Facades\Artisan;
use RuntimeException;

/**
 * Group J3 — restore demonstration catalogues without touching non-demo accounts.
 */
class PreviewSandboxCatalogRestore
{
    public function restoreForSession(PreviewSandboxSession $session): void
    {
        DatabaseDeploySafety::assertNotProtectedEnvironment('restore preview sandbox catalogues');

        $catalog = (string) ($session->catalog ?? '');

        $exit = match ($catalog) {
            'PlatformDemoCatalog' => Artisan::call('mutqin:seed-platform-demo'),
            'OrganisationNetworkCatalog' => Artisan::call('mutqin:seed-organisation-network'),
            'memorisation.demo' => 0,
            default => throw new RuntimeException('This sandbox session has no restorable classroom catalogue.'),
        };

        if ($exit !== 0) {
            throw new RuntimeException('Demo catalogue restore command failed.');
        }

        $session->forceFill([
            'last_activity_at' => now(),
            'reset_at' => now(),
        ])->save();
        $session->clearQuotas();
    }

    public function canRestore(PreviewSandboxSession $session): bool
    {
        $catalog = (string) ($session->catalog ?? '');

        return in_array($catalog, [
            'PlatformDemoCatalog',
            'OrganisationNetworkCatalog',
        ], true);
    }

    /**
     * @return list<string>
     */
    public static function restoreHints(): array
    {
        return [
            LandingPreviewDemo::CLASSROOM_PLATFORM => 'mutqin:seed-platform-demo',
            LandingPreviewDemo::CLASSROOM_ORG_HALAQA => 'mutqin:seed-organisation-network',
        ];
    }
}
