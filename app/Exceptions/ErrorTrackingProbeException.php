<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Distinctive exception thrown only by the authorized error-tracking probe.
 * Safe to report — contains no user, Qur'an, or audio data.
 */
class ErrorTrackingProbeException extends RuntimeException
{
    public function __construct()
    {
        parent::__construct('Mutqin error-tracking probe');
    }
}
