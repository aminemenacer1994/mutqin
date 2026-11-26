<?php

namespace App\Enums;

enum StudentImportBatchStatus: string
{
    case Uploaded = 'uploaded';
    case Processing = 'processing';
    case ReviewRequired = 'review_required';
    case Ready = 'ready';
    case Importing = 'importing';
    case Completed = 'completed';
    case Failed = 'failed';

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    public function isTerminal(): bool
    {
        return in_array($this, [self::Completed, self::Failed], true);
    }
}