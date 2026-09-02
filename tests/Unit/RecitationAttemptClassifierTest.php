<?php

namespace Tests\Unit;

use App\Services\Memorisation\RecitationAttemptClassifier;
use PHPUnit\Framework\TestCase;

class RecitationAttemptClassifierTest extends TestCase
{
    public function test_silence_is_not_a_valid_check(): void
    {
        $classification = RecitationAttemptClassifier::classifyPayload([
            'duration_ms' => 4000,
            'recognition_words' => [],
            'transcript' => '',
        ]);

        $this->assertSame(RecitationAttemptClassifier::SILENCE_NO_SPEECH, $classification['class']);
        $this->assertFalse($classification['valid_check']);
        $this->assertFalse(RecitationAttemptClassifier::affectsScoring($classification));
        $this->assertStringContainsString('recitation', $classification['retry_guidance']);
    }

    public function test_zero_byte_equivalent_empty_payload_is_empty_transcript(): void
    {
        $classification = RecitationAttemptClassifier::classifyPayload([
            'recognition_words' => [],
            'transcript' => '   ',
        ]);

        $this->assertSame(RecitationAttemptClassifier::EMPTY_LOW_CONFIDENCE_TRANSCRIPT, $classification['class']);
        $this->assertFalse($classification['affects_scoring']);
    }

    public function test_recording_too_short_is_rejected(): void
    {
        $classification = RecitationAttemptClassifier::classifyPayload([
            'duration_ms' => 400,
            'transcript' => 'الحمد',
            'recognition_words' => [
                ['word' => 'الحمد', 'confidence' => 0.95, 'start' => 0, 'end' => 0.2],
            ],
        ]);

        $this->assertSame(RecitationAttemptClassifier::RECORDING_TOO_SHORT, $classification['class']);
        $this->assertStringContainsString('too short', $classification['retry_guidance']);
    }

    public function test_microphone_denied_token_is_classified(): void
    {
        $classification = RecitationAttemptClassifier::classifyPayload([
            'failure_reason' => 'mic_permission',
            'recognition_words' => [
                ['word' => 'بسم', 'confidence' => 0.9],
            ],
            'duration_ms' => 4000,
        ]);

        $this->assertSame(RecitationAttemptClassifier::MICROPHONE_DENIED, $classification['class']);
        $this->assertFalse($classification['retryable']);
    }

    public function test_empty_and_low_confidence_transcripts_are_invalid(): void
    {
        $empty = RecitationAttemptClassifier::classifyPayload([
            'recognition_words' => [],
            'transcript' => '',
        ]);
        $this->assertSame(RecitationAttemptClassifier::EMPTY_LOW_CONFIDENCE_TRANSCRIPT, $empty['class']);

        $low = RecitationAttemptClassifier::classifyPayload([
            'duration_ms' => 5000,
            'recognition_words' => [
                ['word' => 'xyz', 'confidence' => 0.1],
                ['word' => 'abc', 'confidence' => 0.12],
            ],
        ]);
        $this->assertSame(RecitationAttemptClassifier::EMPTY_LOW_CONFIDENCE_TRANSCRIPT, $low['class']);
    }

    public function test_timeout_and_provider_errors_are_not_scored(): void
    {
        $timeout = RecitationAttemptClassifier::classifyPayload([
            'failure_reason' => 'timeout',
        ]);
        $this->assertSame(RecitationAttemptClassifier::PROVIDER_NETWORK_ERROR, $timeout['class']);

        $provider = RecitationAttemptClassifier::classifyPayload([
            'attempt_class' => RecitationAttemptClassifier::PROVIDER_NETWORK_ERROR,
            'provider_status' => 503,
        ]);
        $this->assertSame(RecitationAttemptClassifier::PROVIDER_NETWORK_ERROR, $provider['class']);
        $this->assertFalse($provider['valid_check']);
    }

    public function test_cancelled_and_stale_attempts_are_ignored(): void
    {
        $cancelled = RecitationAttemptClassifier::classifyPayload([
            'failure_reason' => 'cancelled',
            'recognition_words' => [
                ['word' => 'بسم', 'confidence' => 0.95],
            ],
            'duration_ms' => 4000,
        ]);
        $this->assertSame(RecitationAttemptClassifier::CANCELLED_STALE, $cancelled['class']);

        $stale = RecitationAttemptClassifier::classifyPayload([
            'failure_reason' => 'stale',
        ]);
        $this->assertSame(RecitationAttemptClassifier::CANCELLED_STALE, $stale['class']);
    }

    public function test_valid_incorrect_recitation_stays_scoreable(): void
    {
        $classification = RecitationAttemptClassifier::classifyPayload([
            'duration_ms' => 6000,
            'transcript' => 'قل هو الله احد',
            'recognition_words' => [
                ['word' => 'قل', 'confidence' => 0.92],
                ['word' => 'هو', 'confidence' => 0.9],
                ['word' => 'الله', 'confidence' => 0.91],
                ['word' => 'احد', 'confidence' => 0.88],
            ],
        ]);

        $this->assertSame(RecitationAttemptClassifier::VALID_CHECK, $classification['class']);
        $this->assertTrue($classification['valid_check']);
        $this->assertTrue(RecitationAttemptClassifier::affectsScoring($classification));
        $this->assertSame('', $classification['retry_guidance']);
    }

    public function test_unknown_failure_reason_does_not_discard_spoken_audio(): void
    {
        $classification = RecitationAttemptClassifier::classifyPayload([
            'failure_reason' => 'weak',
            'duration_ms' => 5000,
            'recognition_words' => [
                ['word' => 'بسم', 'confidence' => 0.94],
                ['word' => 'الله', 'confidence' => 0.93],
            ],
        ]);

        $this->assertSame(RecitationAttemptClassifier::VALID_CHECK, $classification['class']);
    }
}
