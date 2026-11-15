<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LearningPlanTemplateItem extends Model
{
    protected $guarded = ['*'];

    public function template(): BelongsTo
    {
        return $this->belongsTo(LearningPlanTemplate::class, 'learning_plan_template_id');
    }
}
