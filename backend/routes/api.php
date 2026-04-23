<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\OffreController;
use App\Http\Controllers\AuthController;

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

// Hna kan'3ytou l'Chef (L'Controller) dyal l'offres bach y'3ti lina l'ma3loumat
Route::get('/offres', [OffreController::class, 'index']); // Hna kan'3ytou l'Chef: "Jbed lina kolchi mn Tllaja"
