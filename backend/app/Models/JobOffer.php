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
 * @property string|null $image_path
 * @property string|null $suspension_reason
 * @property CarbonInterface|null $expires_at
 * @property-read string|null $image_url
 * @property-read string|null $establishment_name
 * @property-read string|null $establishment_type
 * @property-read User $recruteur
 * @property-read Quiz|null $quiz
 */
class JobOffer extends Model
{
    use HasFactory;

    protected $guarded = [];

    protected $appends = ['image_url', 'establishment_name', 'establishment_type'];

    public function getImageUrlAttribute(): ?string
    {
        if (! $this->image_path) {
            return null;
        }

        $url = '/storage/'.ltrim($this->image_path, '/');

        if (app()->runningInConsole()) {
            return asset($url);
        }

        return rtrim(request()->getSchemeAndHttpHost(), '/').$url;
    }

    public function getEstablishmentNameAttribute(): ?string
    {
        return $this->recruteur?->recruteurProfile?->nom_etablissement;
    }

    public function getEstablishmentTypeAttribute(): ?string
    {
        return $this->recruteur?->recruteurProfile?->type_etablissement;
    }

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

    public function savedByCandidates(): HasMany
    {
        return $this->hasMany(SavedJobOffer::class);
    }
}
