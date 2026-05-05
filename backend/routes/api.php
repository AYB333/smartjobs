<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\OffreController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\PostulationController;
use App\Http\Controllers\QuizController;
use App\Http\Controllers\QuestionController;
use App\Http\Controllers\QuizAttemptController;

// Public Auth Routes
Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:5,1'); // Rate Limit: max 5 login attempts per minute

// Protected Auth Routes
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);
});

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

// -----------------------------------------------------
// Phase 3 & 4: Job Offers, Postulations & Quizzes
// -----------------------------------------------------

// Public Routes (Anyone can view offers)
Route::get('/offres', [OffreController::class, 'index']); // Search & list active offers
Route::get('/offres/{id}', [OffreController::class, 'show']); // View specific offer details

// Protected Routes (Sanctum Required)
Route::middleware('auth:sanctum')->group(function () {
    
    // Recruteur Routes
    Route::middleware('isRecruteur')->group(function () {
        Route::get('/mes-offres', [OffreController::class, 'mesOffres']); // View their own offers
        Route::post('/offres', [OffreController::class, 'store']); // Create new offer
        Route::put('/offres/{id}', [OffreController::class, 'update']); // Update an offer
        Route::delete('/offres/{id}', [OffreController::class, 'destroy']); // Delete an offer
        
        // Phase 3: Postulations (Recruteur)
        Route::get('/offres/{id}/postulants', [PostulationController::class, 'postulants']);
        Route::patch('/postulations/{id}/status', [PostulationController::class, 'updateStatus']);

        // Phase 4: Quizzes (Recruteur)
        Route::post('/offres/{id}/quiz', [QuizController::class, 'store']);
        Route::get('/offres/{id}/quiz', [QuizController::class, 'show']);
        Route::delete('/quizzes/{id}', [QuizController::class, 'destroy']);
        
        // Phase 4: Questions (Recruteur)
        Route::post('/quizzes/{id}/questions', [QuestionController::class, 'store']);
        Route::delete('/questions/{id}', [QuestionController::class, 'destroy']);
    });

    // Candidat Routes
    Route::middleware('isCandidat')->group(function () {
        // Phase 3: Postulations (Candidat)
        Route::post('/offres/{id}/postuler', [PostulationController::class, 'postuler']);
        Route::get('/mes-postulations', [PostulationController::class, 'mesPostulations']);

        // Phase 4: Quiz Attempt (Candidat)
        Route::get('/offres/{id}/pass-quiz', [QuizAttemptController::class, 'getQuiz']);
        Route::post('/offres/{id}/pass-quiz/submit', [QuizAttemptController::class, 'submitQuiz']);
    });
});