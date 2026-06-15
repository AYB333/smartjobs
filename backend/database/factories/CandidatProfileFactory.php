<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<\App\Models\CandidatProfile>
 */
class CandidatProfileFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id' => User::factory()->candidat(),
            'ville' => 'Casablanca',
            'experience' => '1 a 2 ans',
            'poste_recherche' => 'Serveur',
            'cv_path' => 'cvs/test-cv.pdf',
            'photo_path' => null,
        ];
    }

    public function withoutCv(): static
    {
        return $this->state(fn (array $attributes) => [
            'cv_path' => null,
        ]);
    }
}
