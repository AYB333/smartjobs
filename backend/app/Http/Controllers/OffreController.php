<?php

namespace App\Http\Controllers;

use App\Models\Offre; // 1. Hna kan'3ytou l'Chef (L'Model) bach L'Garsoun y'qder y'hder m3ah

class OffreController extends Controller
{
    // 2. Hadi hiya l'mouhima dyal L'Garsoun: Jbed ga3 l'offres
    public function index()
    {
        $offres = Offre::all(); // Goulna l'Chef: "Jbed lina kolchi mn Tllaja"

        return response()->json($offres); // L'Garsoun kiy'wjedhom 3la chkel JSON (L'ghilaf li kiy'fhemo React)
    }
}
