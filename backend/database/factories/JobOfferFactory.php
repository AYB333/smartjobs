<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<\App\Models\JobOffer>
 */
class JobOfferFactory extends Factory
{
    public function definition(): array
    {
        return [
            'recruteur_id' => User::factory()->recruteur(),
            'titre_poste' => 'Serveur',
            'description' => 'Accueil client, service en salle et suivi des standards.',
            'ville' => 'Casablanca',
            'salaire' => 4500,
            'type_contrat' => 'CDI',
            'duree_validite' => '30',
            'expires_at' => now()->addDays(30)->toDateString(),
            'status' => 'active',
        ];
    }

    public function suspended(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'suspended',
        ]);
    }

    public function expired(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'expired',
            'expires_at' => now()->subDay()->toDateString(),
        ]);
    }
}
