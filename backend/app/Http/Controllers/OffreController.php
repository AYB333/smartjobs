<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\JobOffer;
use App\Http\Requests\StoreOffreRequest;
use App\Http\Requests\UpdateOffreRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;

class OffreController extends Controller
{
    /**
     * Display a listing of active offers (for everyone).
     */
    public function index(Request $request)
    {
        $query = JobOffer::with('recruteur.recruteurProfile')->where('status', 'active');

        // Search & Filtering
        if ($request->filled('search')) {
            $query->where(function($q) use ($request) {
                $q->where('titre_poste', 'like', '%' . $request->search . '%')
                  ->orWhere('description', 'like', '%' . $request->search . '%');
            });
        }

        if ($request->filled('ville')) {
            $query->where('ville', $request->ville);
        }

        if ($request->filled('type_contrat')) {
            $query->where('type_contrat', $request->type_contrat);
        }

        $offres = $query->latest()->paginate(10);

        return response()->json([
            'success' => true,
            'data' => $offres
        ]);
    }

    /**
     * Store a newly created offer (Recruteur only).
     */
    public function store(StoreOffreRequest $request)
    {
        $validated = $request->validated();

        // Calculate expires_at
        $validated['expires_at'] = Carbon::now()->addDays((int) $validated['duree_validite']);
        $validated['recruteur_id'] = Auth::id();
        $validated['status'] = 'active';

        $offre = JobOffer::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Offre creee avec succes.',
            'data' => $offre
        ], 201);
    }

    /**
     * Display the specified offer.
     */
    public function show($id)
    {
        $offre = JobOffer::with('recruteur.recruteurProfile')->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $offre
        ]);
    }

    /**
     * Display current recruteur offers.
     */
    public function mesOffres()
    {
        $offres = JobOffer::where('recruteur_id', Auth::id())->latest()->paginate(10);

        return response()->json([
            'success' => true,
            'data' => $offres
        ]);
    }

    /**
     * Update the specified offer (Recruteur only).
     */
    public function update(UpdateOffreRequest $request, $id)
    {
        $offre = JobOffer::findOrFail($id);

        if ($offre->recruteur_id !== Auth::id()) {
            return response()->json(['success' => false, 'message' => 'Non autorise.'], 403);
        }

        $validated = $request->validated();

        if (isset($validated['duree_validite']) && $validated['duree_validite'] !== $offre->duree_validite) {
            $validated['expires_at'] = Carbon::parse($offre->created_at)->addDays((int) $validated['duree_validite']);
        }

        $offre->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Offre mise a jour avec succes.',
            'data' => $offre
        ]);
    }

    /**
     * Remove the specified offer (Recruteur only).
     */
    public function destroy($id)
    {
        $offre = JobOffer::findOrFail($id);

        if ($offre->recruteur_id !== Auth::id()) {
            return response()->json(['success' => false, 'message' => 'Non autorise.'], 403);
        }

        $offre->delete();

        return response()->json([
            'success' => true,
            'message' => 'Offre supprimee avec succes.'
        ]);
    }
}