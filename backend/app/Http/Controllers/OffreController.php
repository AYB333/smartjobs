<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreOffreRequest;
use App\Http\Requests\UpdateOffreRequest;
use App\Models\JobOffer;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class OffreController extends Controller
{
    private function isAdminRequest(Request $request): bool
    {
        /** @var User|null $user */
        $user = $request->user('sanctum') ?? Auth::guard('sanctum')->user();

        return $user?->role === 'admin';
    }

    /**
     * Get dynamic filters for jobs
     */
    public function filters()
    {
        $villes = JobOffer::where('status', 'active')
            ->whereNotNull('ville')
            ->where('ville', '!=', '')
            ->distinct()
            ->pluck('ville');

        $typesContrat = JobOffer::where('status', 'active')
            ->whereNotNull('type_contrat')
            ->where('type_contrat', '!=', '')
            ->distinct()
            ->pluck('type_contrat');

        return response()->json([
            'villes' => $villes,
            'types_contrat' => $typesContrat,
        ]);
    }

    /**
     * Display a listing of active offers (for everyone).
     */
    public function index(Request $request)
    {
        $includeAllStatuses = $request->boolean('include_all_statuses');

        if ($includeAllStatuses && ! $this->isAdminRequest($request)) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized. Admin access required.',
            ], 403);
        }

        $query = JobOffer::with('recruteur.recruteurProfile')
            ->withCount('applications')
            ->withExists('quiz');

        if (! $includeAllStatuses) {
            $query->where('status', 'active')
                ->whereDate('expires_at', '>=', Carbon::today());
        }

        // Search & Filtering
        if ($request->filled('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('titre_poste', 'like', '%'.$request->search.'%')
                    ->orWhere('description', 'like', '%'.$request->search.'%');
            });
        }

        if ($request->filled('ville')) {
            $query->where('ville', $request->ville);
        }

        if ($request->filled('type_contrat')) {
            $query->where('type_contrat', $request->type_contrat);
        }

        $maxPerPage = $includeAllStatuses ? 100 : 12;
        $perPage = min((int) $request->integer('limit', 10), $maxPerPage);
        $offres = $query->latest()->paginate(max($perPage, 1));

        return response()->json([
            'success' => true,
            'data' => $offres,
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
            'data' => $offre,
        ], 201);
    }

    /**
     * Display the specified offer.
     */
    public function show($id)
    {
        $offre = JobOffer::with('recruteur.recruteurProfile')
            ->withExists('quiz')
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $offre,
        ]);
    }

    /**
     * Display current recruteur offers.
     */
    public function mesOffres()
    {
        $offres = JobOffer::withCount('applications')
            ->withExists('quiz')
            ->where('recruteur_id', Auth::id())
            ->latest()
            ->paginate(10);

        return response()->json([
            'success' => true,
            'data' => $offres,
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
            'data' => $offre,
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
            'message' => 'Offre supprimee avec succes.',
        ]);
    }
}
