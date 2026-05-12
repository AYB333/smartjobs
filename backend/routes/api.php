<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\OffreController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\PostulationController;
use App\Http\Controllers\QuizController;
use App\Http\Controllers\QuestionController;
use App\Http\Controllers\QuizAttemptController;
use App\Http\Controllers\PaymentController;

Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:5,1');

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);
});

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::get('/offres', [OffreController::class, 'index']);
Route::get('/offres/{id}', [OffreController::class, 'show']);

// Phase 5: Webhook
Route::post('/payment/webhook', [PaymentController::class, 'webhook']);

Route::middleware('auth:sanctum')->group(function () {
    // Recruteur Routes
    Route::middleware('isRecruteur')->group(function () {
        Route::get('/mes-offres', [OffreController::class, 'mesOffres']);
        Route::post('/offres', [OffreController::class, 'store']);
        Route::put('/offres/{id}', [OffreController::class, 'update']);
        Route::delete('/offres/{id}', [OffreController::class, 'destroy']);
        
        Route::get('/offres/{id}/postulants', [PostulationController::class, 'postulants']);
        Route::patch('/postulations/{id}/status', [PostulationController::class, 'updateStatus']);

        Route::post('/offres/{id}/quiz', [QuizController::class, 'store']);
        Route::get('/offres/{id}/quiz', [QuizController::class, 'show']);
        Route::delete('/quizzes/{id}', [QuizController::class, 'destroy']);
        
        Route::post('/quizzes/{id}/questions', [QuestionController::class, 'store']);
        Route::delete('/questions/{id}', [QuestionController::class, 'destroy']);

        // Phase 5: Payment Routes
        Route::post('/payment/create-intent', [PaymentController::class, 'createIntent']);
        Route::post('/payment/confirm', [PaymentController::class, 'confirm']);
        Route::get('/payment/subscription', [PaymentController::class, 'mySubscription']);
    });

    // Candidat Routes
    Route::middleware('isCandidat')->group(function () {
        Route::post('/offres/{id}/postuler', [PostulationController::class, 'postuler']);
        Route::get('/mes-postulations', [PostulationController::class, 'mesPostulations']);

        Route::get('/offres/{id}/pass-quiz', [QuizAttemptController::class, 'getQuiz']);
        Route::post('/offres/{id}/pass-quiz/submit', [QuizAttemptController::class, 'submitQuiz']);
    });
});
