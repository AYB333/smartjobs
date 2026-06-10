<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property int $job_offer_id
 * @property int $passing_score
 * @property-read JobOffer $jobOffer
 */
class Quiz extends Model
{
    use HasFactory;

    protected $guarded = [];

    public function jobOffer(): BelongsTo
    {
        return $this->belongsTo(JobOffer::class);
    }

    public function questions(): HasMany
    {
        return $this->hasMany(Question::class);
    }
}
