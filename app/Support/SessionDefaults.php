<?php

namespace App\Support;

/**
 * Shared defaults for newly started practice sessions.
 * Recommendation plans may still set an explicit repetitions value when required.
 */
final class SessionDefaults
{
    /** Default ayah/step repetitions for a genuinely new session (1x). */
    public const REPETITIONS = 1;
}
