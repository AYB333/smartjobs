<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<\App\Models\RecruteurProfile>
 */
class RecruteurProfileFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id' => User::factory()->recruteur(),
            'nom_etablissement' => 'Hotel Test',
            'ville' => 'Casablanca',
            'type_etablissement' => 'hotel',
            'is_premium' => false,
            'premium_expires_at' => null,
            'vues_aujourdhui' => 0,
            'derniere_vue_date' => null,
        ];
    }
}
