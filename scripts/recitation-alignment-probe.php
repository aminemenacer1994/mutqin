<?php

/**
 * Stdin JSON probe for recitation API alignment accuracy (internal tooling only).
 *
 * Input: { "target_text": "...", "recognition_words": [...], "options": {} }
 * Output: { "accuracy": int, "word_count": int, "scenario_counts": {...} }
 */

declare(strict_types=1);

$root = dirname(__DIR__);

require $root.'/vendor/autoload.php';

$app = require_once $root.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$raw = stream_get_contents(STDIN);
$payload = json_decode($raw ?: '', true);
if (! is_array($payload)) {
    fwrite(STDERR, "Invalid JSON input\n");
    exit(2);
}

$targetText = (string) ($payload['target_text'] ?? '');
$recognitionWords = is_array($payload['recognition_words'] ?? null) ? $payload['recognition_words'] : [];
$options = is_array($payload['options'] ?? null) ? $payload['options'] : [];

/** @var \App\Services\Memorisation\QuranAlignmentService $alignment */
$alignment = app(\App\Services\Memorisation\QuranAlignmentService::class);

$result = $alignment->align([], $recognitionWords, $targetText, $options);

echo json_encode([
    'accuracy' => (int) ($result['accuracy'] ?? 0),
    'word_count' => count($result['word_results'] ?? []),
    'scenario_counts' => $result['scenario_counts'] ?? [],
    'word_results' => array_map(static fn (array $word): array => [
        'status' => $word['status'] ?? null,
        'type' => $word['type'] ?? null,
    ], $result['word_results'] ?? []),
    'extra_words' => array_map(static fn (array $word): array => [
        'type' => $word['type'] ?? null,
        'word' => $word['word'] ?? null,
    ], $result['extra_words'] ?? []),
], JSON_UNESCAPED_UNICODE);
