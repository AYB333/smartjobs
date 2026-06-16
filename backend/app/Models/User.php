<?php

namespace App\Models;

use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

/**
 * @property int $id
 * @property string $name
 * @property string $email
 * @property string $role
 * @property bool $is_premium
 * @property CarbonInterface|null $premium_expires_at
 * @property int $vues_aujourdhui
 * @property CarbonInterface|null $derniere_vue_date
 */
class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'is_premium',
        'premium_expires_at',
        'vues_aujourdhui',
        'derniere_vue_date',
    ];

    protected $hidden = ['password', 'remember_token'];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_premium' => 'boolean',
            'premium_expires_at' => 'datetime',
            'vues_aujourdhui' => 'integer',
            'derniere_vue_date' => 'date',
        ];
    }

    public function candidatProfile(): HasOne
    {
        return $this->hasOne(CandidatProfile::class);
    }

    public function recruteurProfile(): HasOne
    {
        return $this->hasOne(RecruteurProfile::class);
    }

    public function jobOffers(): HasMany
    {
        return $this->hasMany(JobOffer::class, 'recruteur_id');
    }

    public function applications(): HasMany
    {
        return $this->hasMany(Application::class, 'candidat_id');
    }

    public function savedJobOffers(): HasMany
    {
        return $this->hasMany(SavedJobOffer::class);
    }

    public function smartNotifications(): HasMany
    {
        return $this->hasMany(UserNotification::class);
    }

    public function sentApplicationMessages(): HasMany
    {
        return $this->hasMany(ApplicationMessage::class, 'sender_id');
    }
}
