<?php

namespace Tests\Unit;

use App\Exceptions\ErrorTrackingProbeException;
use App\Support\ErrorReporting;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Tests\TestCase;

class ErrorReportingTest extends TestCase
{
    public function test_ignores_expected_client_failures_but_not_probes_or_server_errors(): void
    {
        $this->assertTrue(ErrorReporting::shouldIgnore(ValidationException::withMessages(['name' => 'required'])));
        $this->assertTrue(ErrorReporting::shouldIgnore(new AuthenticationException));
        $this->assertTrue(ErrorReporting::shouldIgnore(new NotFoundHttpException));
        $this->assertTrue(ErrorReporting::shouldIgnore(new HttpException(422, 'invalid')));

        $this->assertFalse(ErrorReporting::shouldIgnore(new ErrorTrackingProbeException));
        $this->assertFalse(ErrorReporting::shouldIgnore(new HttpException(500, 'boom')));
        $this->assertFalse(ErrorReporting::shouldIgnore(new \RuntimeException('unexpected')));
    }

    public function test_maps_paths_to_feature_areas(): void
    {
        $this->assertSame('speechmatics', ErrorReporting::featureFromPath('memorisation/transcription-token'));
        $this->assertSame('mushaf', ErrorReporting::featureFromPath('memorisation/madani-mushaf/pages/1'));
        $this->assertSame('quran', ErrorReporting::featureFromPath('memorisation/quran-proxy/alquran/surah/1'));
        $this->assertSame('admin', ErrorReporting::featureFromPath('api/admin/users'));
        $this->assertSame('app', ErrorReporting::featureFromPath('about'));
    }

    public function test_accepts_only_safe_request_ids(): void
    {
        $this->assertTrue(ErrorReporting::isValidRequestId('11111111-1111-1111-1111-111111111111'));
        $this->assertFalse(ErrorReporting::isValidRequestId('not a token'));
        $this->assertFalse(ErrorReporting::isValidRequestId('short'));
        $this->assertFalse(ErrorReporting::isValidRequestId(null));
    }
}
