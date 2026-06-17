<?php

use App\Http\Controllers\AdminController;
use App\Http\Controllers\ApplicationMessageController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\OffreController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\PostulationController;
use App\Http\Controllers\QuestionController;
use App\Http\Controllers\QuizAttemptController;
use App\Http\Controllers\QuizController;
use App\Http\Controllers\SavedJobOfferController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:5,1');

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::patch('/auth/me', [AuthController::class, 'updateMe']);
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);
    Route::patch('/notifications/read-all', [NotificationController::class, 'markAllRead']);
    Route::patch('/notifications/{notification}/read', [NotificationController::class, 'markRead']);
    Route::get('/postulations/{application}/messages', [ApplicationMessageController::class, 'index']);
    Route::post('/postulations/{application}/messages', [ApplicationMessageController::class, 'store']);
});

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::get('/offres', [OffreController::class, 'index']);
Route::get('/offres/filters', [OffreController::class, 'filters']);
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
        Route::get('/postulations/{id}/consult', [PostulationController::class, 'consult']);
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
        Route::get('/saved-offers', [SavedJobOfferController::class, 'index']);
        Route::post('/offres/{id}/save', [SavedJobOfferController::class, 'store']);
        Route::delete('/offres/{id}/save', [SavedJobOfferController::class, 'destroy']);

        Route::get('/offres/{id}/pass-quiz', [QuizAttemptController::class, 'getQuiz']);
        Route::post('/offres/{id}/pass-quiz/submit', [QuizAttemptController::class, 'submitQuiz']);
    });

    Route::middleware('isAdmin')->group(function () {
        Route::get('/admin/stats', [AdminController::class, 'stats']);
        Route::get('/admin/users', [AdminController::class, 'users']);
        Route::patch('/admin/offers/{id}/status', [AdminController::class, 'updateOfferStatus']);
    });
});
