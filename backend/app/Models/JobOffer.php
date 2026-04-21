<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class JobOffer extends Model
{
    use HasFactory;

    protected $guarded = [];

    public function recruteur()
    {
        return $this->belongsTo(User::class, 'recruteur_id');
    }

    public function applications()
    {
        return $this->hasMany(Application::class);
    }

    public function quiz()
    {
        return $this->hasOne(Quiz::class);
    }
}
