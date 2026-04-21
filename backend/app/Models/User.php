<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = ['name', 'email', 'password', 'role'];

    protected $hidden = ['password', 'remember_token'];

    protected function casts(): array
    {
        return ['email_verified_at' => 'datetime', 'password' => 'hashed'];
    }

    public function candidatProfile()
    {
        return $this->hasOne(CandidatProfile::class);
    }

    public function recruteurProfile()
    {
        return $this->hasOne(RecruteurProfile::class);
    }

    public function jobOffers()
    {
        return $this->hasMany(JobOffer::class, 'recruteur_id');
    }

    public function applications()
    {
        return $this->hasMany(Application::class, 'candidat_id');
    }
}
