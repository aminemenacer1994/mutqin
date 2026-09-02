<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Feedback extends Model
{
    protected $table = 'feedbacks';

    public const TYPE_SUGGESTION = 'suggestion';

    public const TYPE_BUG = 'bug';

    public const TYPE_AI_RECITATION = 'ai_recitation';

    public const TYPE_DESIGN = 'design';

    public const TYPE_OTHER = 'other';

    public const STATUS_NEW = 'new';

    public const STATUS_REVIEWING = 'reviewing';

    public const STATUS_PLANNED = 'planned';

    public const STATUS_RESOLVED = 'resolved';

    public const STATUS_CLOSED = 'closed';

    public const AI_CHECK_ASSESSMENT = 'assessment';

    public const AI_CHECK_AI_RECITE = 'ai_recite_attempt';

    public const TYPES = [
        self::TYPE_SUGGESTION,
        self::TYPE_BUG,
        self::TYPE_AI_RECITATION,
        self::TYPE_DESIGN,
        self::TYPE_OTHER,
    ];

    public const STATUSES = [
        self::STATUS_NEW,
        self::STATUS_REVIEWING,
        self::STATUS_PLANNED,
        self::STATUS_RESOLVED,
        self::STATUS_CLOSED,
    ];

    public const AI_REASONS = [
        'correct_marked_wrong',
        'missed_mistake',
        'wrong_highlight',
        'recording_problem',
        'other',
    ];

    protected $fillable = [
        'user_id',
        'type',
        'message',
        'status',
        'context',
        'ai_check_id',
        'ai_check_source',
        'ai_reason',
        'screenshot_path',
        'admin_note',
    ];

    protected function casts(): array
    {
        return [
            'context' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function scopeAiRecitationComplaints($query)
    {
        return $query->where('type', self::TYPE_AI_RECITATION)->whereNotNull('ai_check_id');
    }
}
