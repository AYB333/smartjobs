<?php

namespace App\Http\Controllers;

use App\Models\Quiz;
use App\Models\JobOffer;
use App\Http\Requests\StoreQuizRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class QuizController extends Controller
{
    public function store(StoreQuizRequest $request, $offerId)
    {
        $offer = JobOffer::findOrFail($offerId);
        
        if ($offer->recruteur_id !== Auth::id()) {
            return response()->json(['success' => false, 'message' => 'Non autorise.'], 403);
        }

        $validated = $request->validated();
        $validated['job_offer_id'] = $offerId;

        $quiz = Quiz::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Quiz cree avec succes.',
            'data' => $quiz
        ], 201);
    }

    public function show($offerId)
    {
        $offer = JobOffer::findOrFail($offerId);
        
        if ($offer->recruteur_id !== Auth::id()) {
            return response()->json(['success' => false, 'message' => 'Non autorise.'], 403);
        }

        $quiz = Quiz::with('questions')->where('job_offer_id', $offerId)->first();

        if (!$quiz) {
            return response()->json(['success' => false, 'message' => 'Aucun quiz trouve pour cette offre.'], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $quiz
        ]);
    }

    public function destroy($quizId)
    {
        $quiz = Quiz::with('jobOffer')->findOrFail($quizId);
        
        if ($quiz->jobOffer->recruteur_id !== Auth::id()) {
            return response()->json(['success' => false, 'message' => 'Non autorise.'], 403);
        }

        $quiz->delete();

        return response()->json([
            'success' => true,
            'message' => 'Quiz supprime avec succes.'
        ]);
    }
}