<?php

namespace Database\Factories;

use App\Models\Quiz;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<\App\Models\Question>
 */
class QuestionFactory extends Factory
{
    public function definition(): array
    {
        return [
            'quiz_id' => Quiz::factory(),
            'question_text' => 'Quelle est la bonne pratique en service client ?',
            'options' => ['Saluer le client', 'Ignorer le client', 'Fermer la salle'],
            'correct_answer' => 'Saluer le client',
        ];
    }
}
