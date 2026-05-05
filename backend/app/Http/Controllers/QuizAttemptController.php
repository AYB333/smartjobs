<?php

namespace App\Http\Controllers;

use App\Models\JobOffer;
use App\Models\Quiz;
use App\Models\Question;
use App\Models\Application;
use App\Http\Requests\SubmitQuizRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class QuizAttemptController extends Controller
{
    /**
     * Get quiz for candidate (Hide correct_answer).
     */
    public function getQuiz($offerId)
    {
        $offer = JobOffer::findOrFail($offerId);
        
        $quiz = Quiz::with(['questions' => function ($query) {
            $query->select('id', 'quiz_id', 'question_text', 'options'); // Do NOT retrieve correct_answer!
        }])->where('job_offer_id', $offerId)->first();

        if (!$quiz) {
            return response()->json(['success' => false, 'message' => 'Aucun test pour cette offre.'], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $quiz
        ]);
    }

    /**
     * Submit answers and calculate score.
     */
    public function submitQuiz(SubmitQuizRequest $request, $offerId)
    {
        $offer = JobOffer::findOrFail($offerId);
        $candidatId = Auth::id();

        // Ensure candidate applied (Optional, but logical)
        $application = Application::where('job_offer_id', $offerId)
                                  ->where('candidat_id', $candidatId)
                                  ->first();

        if (!$application) {
            return response()->json(['success' => false, 'message' => 'Commencez par postuler d abord.'], 403);
        }

        // Prevent double submission? Not explicitly stated but good to add if quiz_score not null
        if ($application->quiz_score !== null) {
            return response()->json(['success' => false, 'message' => 'Vous avez deja passe ce test.'], 400);
        }

        $quiz = Quiz::where('job_offer_id', $offerId)->first();
        if (!$quiz) {
            return response()->json(['success' => false, 'message' => 'Quiz introuvable.'], 404);
        }

        $answers = collect($request->validated()['answers']);
        $totalQuestions = Question::where('quiz_id', $quiz->id)->count();
        
        if ($totalQuestions === 0) {
            return response()->json(['success' => false, 'message' => 'Le quiz est vide.'], 400);
        }

        $correctAnswers = 0;

        foreach ($answers as $ans) {
            $question = Question::find($ans['question_id']);
            if ($question && $question->quiz_id === $quiz->id) {
                if ($question->correct_answer === $ans['answer']) {
                    $correctAnswers++;
                }
            }
        }

        // Calculate out of 100
        $scorePercentage = ($correctAnswers / $totalQuestions) * 100;

        // Update Application
        $application->update([
            'quiz_score' => round($scorePercentage)
        ]);

        $passed = round($scorePercentage) >= $quiz->passing_score;

        return response()->json([
            'success' => true,
            'message' => 'Examen soumis avec succes.',
            'data' => [
                'score' => round($scorePercentage),
                'passed' => $passed
            ]
        ]);
    }
}
