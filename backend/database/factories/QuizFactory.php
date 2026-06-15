<?php

namespace Database\Factories;

use App\Models\JobOffer;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<\App\Models\Quiz>
 */
class QuizFactory extends Factory
{
    public function definition(): array
    {
        return [
            'job_offer_id' => JobOffer::factory(),
            'titre' => 'Quiz metier',
            'passing_score' => 50,
        ];
    }
}
