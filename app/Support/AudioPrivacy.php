<?php

namespace App\Support;

/**
 * Read-only helpers for microphone / AI audio privacy config.
 * Never logs or returns raw audio payloads.
 */
final class AudioPrivacy
{
    public const RETENTION_NEVER = 'never';

    public const RETENTION_TEMPORARY = 'temporary';

    public const RETENTION_RETAIN = 'retain';

    public static function policyVersion(): string
    {
        return (string) config('mutqin.audio_privacy.policy_version', '2026-09-01');
    }

    public static function processorName(): string
    {
        $name = trim((string) config('mutqin.audio_privacy.processor_name', 'Speechmatics'));

        return $name !== '' ? $name : 'Speechmatics';
    }

    public static function rawRecordingRetention(): string
    {
        $mode = strtolower(trim((string) config('mutqin.audio_privacy.raw_recording_retention', self::RETENTION_TEMPORARY)));

        return in_array($mode, [self::RETENTION_NEVER, self::RETENTION_TEMPORARY, self::RETENTION_RETAIN], true)
            ? $mode
            : self::RETENTION_TEMPORARY;
    }

    public static function retainsRawAudio(): bool
    {
        return self::rawRecordingRetention() === self::RETENTION_RETAIN;
    }

    public static function temporaryTtlHours(): int
    {
        return max(1, (int) config('mutqin.audio_privacy.temporary_ttl_hours', 24));
    }

    public static function tempDiskPath(): string
    {
        $path = (string) config('mutqin.audio_privacy.temp_disk_path', storage_path('app/tmp/learner-audio'));

        return $path !== '' ? $path : storage_path('app/tmp/learner-audio');
    }

    /**
     * Public, non-sensitive policy snapshot for the browser.
     *
     * @return array{
     *     policy_version: string,
     *     processor_name: string,
     *     raw_recording_retention: string,
     *     temporary_ttl_hours: int,
     *     privacy_policy_url: string
     * }
     */
    public static function clientConfig(): array
    {
        return [
            'policy_version' => self::policyVersion(),
            'processor_name' => self::processorName(),
            'raw_recording_retention' => self::rawRecordingRetention(),
            'temporary_ttl_hours' => self::temporaryTtlHours(),
            'privacy_policy_url' => '/privacy',
        ];
    }
}
