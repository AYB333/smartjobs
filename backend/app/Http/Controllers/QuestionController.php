<?php

namespace App\Http\Controllers;

use App\Models\Quiz;
use App\Models\Question;
use App\Http\Requests\StoreQuestionRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class QuestionController extends Controller
{
    public function store(StoreQuestionRequest $request, $quizId)
    {
        $quiz = Quiz::with('jobOffer')->findOrFail($quizId);
        
        if ($quiz->jobOffer->recruteur_id !== Auth::id()) {
            return response()->json(['success' => false, 'message' => 'Non autorise.'], 403);
        }

        $validated = $request->validated();
        $validated['quiz_id'] = $quizId;

        if (!in_array($validated['correct_answer'], $validated['options'])) {
             return response()->json(['success' => false, 'message' => 'La reponse correcte doit figurer parmi les options.'], 400);
        }

        $question = Question::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Question ajoutee avec succes.',
            'data' => $question
        ], 201);
    }

    public function destroy($questionId)
    {
        $question = Question::with('quiz.jobOffer')->findOrFail($questionId);
        
        if ($question->quiz->jobOffer->recruteur_id !== Auth::id()) {
            return response()->json(['success' => false, 'message' => 'Non autorise.'], 403);
        }

        $question->delete();

        return response()->json([
            'success' => true,
            'message' => 'Question supprimee avec succes.'
        ]);
    }
}