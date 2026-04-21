<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');
// Hna kan'3ytou l'Chef (L'Controller) dyal l'offres
use App\Http\Controllers\OffreController;

// Hna kan'3ytou l'Chef (L'Controller) dyal l'offres bach y'3ti lina l'ma3loumat
Route::get('/offres', [OffreController::class, 'index']); // Hna kan'3ytou l'Chef: "Jbed lina kolchi mn Tllaja
