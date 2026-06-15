<?php

namespace Database\Factories;

use App\Models\JobOffer;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<\App\Models\Application>
 */
class ApplicationFactory extends Factory
{
    public function definition(): array
    {
        return [
            'job_offer_id' => JobOffer::factory(),
            'candidat_id' => User::factory()->candidat(),
            'status' => 'en_attente',
            'quiz_score' => null,
            'cv_path' => 'cvs/test-cv.pdf',
        ];
    }
}
