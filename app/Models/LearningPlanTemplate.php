<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LearningPlanTemplate extends Model
{
    protected $guarded = ['*'];

    protected function casts(): array
    {
        return [
            'is_shared' => 'boolean',
        ];
    }

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    public function organisation(): BelongsTo
    {
        return $this->belongsTo(Organisation::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(LearningPlanTemplateItem::class)->orderBy('sort_order')->orderBy('id');
    }
}
