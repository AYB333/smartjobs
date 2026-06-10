<?php

namespace App\Models;

use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * @property int $id
 * @property int $recruteur_id
 * @property string $titre_poste
 * @property string $ville
 * @property string $status
 * @property CarbonInterface|null $expires_at
 * @property-read User $recruteur
 * @property-read Quiz|null $quiz
 */
class JobOffer extends Model
{
    use HasFactory;

    protected $guarded = [];

    public function recruteur(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recruteur_id');
    }

    public function applications(): HasMany
    {
        return $this->hasMany(Application::class);
    }

    public function quiz(): HasOne
    {
        return $this->hasOne(Quiz::class);
    }
}
