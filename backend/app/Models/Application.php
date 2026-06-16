<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property int $job_offer_id
 * @property int $candidat_id
 * @property string $status
 * @property int|null $quiz_score
 * @property string|null $cv_path
 * @property-read JobOffer $jobOffer
 * @property-read User $candidat
 */
class Application extends Model
{
    use HasFactory;

    protected $guarded = [];

    public function jobOffer(): BelongsTo
    {
        return $this->belongsTo(JobOffer::class);
    }

    public function candidat(): BelongsTo
    {
        return $this->belongsTo(User::class, 'candidat_id');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(ApplicationMessage::class);
    }
}
