<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreOffreRequest;
use App\Http\Requests\UpdateOffreRequest;
use App\Models\JobOffer;
use App\Models\User;
use App\Models\UserNotification;
use App\Support\AdminNotifier;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class OffreController extends Controller
{
    private function isAdminRequest(Request $request): bool
    {
        /** @var User|null $user */
        $user = $request->user('sanctum') ?? Auth::guard('sanctum')->user();

        return $user?->role === 'admin';
    }

    private function normalizeForMatch(?string $value): string
    {
        return Str::lower(Str::ascii(trim((string) $value)));
    }

    private function positionMatches(?string $offerTitle, ?string $wantedPosition): bool
    {
        $title = $this->normalizeForMatch($offerTitle);
        $position = $this->normalizeForMatch($wantedPosition);

        if ($title === '' || $position === '') {
            return false;
        }

        if (str_contains($title, $position) || str_contains($position, $title)) {
            return true;
        }

        $titleWords = array_filter(preg_split('/\s+/', $title) ?: [], fn ($word) => strlen($word) > 2);
        $positionWords = array_filter(preg_split('/\s+/', $position) ?: [], fn ($word) => strlen($word) > 2);

        return count(array_intersect($titleWords, $positionWords)) > 0;
    }

    private function notifyMatchingCandidates(JobOffer $offer): void
    {
        if ($offer->status !== 'active') {
            return;
        }

        User::where('role', 'candidat')
            ->whereHas('candidatProfile', function ($query) use ($offer) {
                $query->where('ville', $offer->ville)
                    ->whereNotNull('poste_recherche')
                    ->where('poste_recherche', '!=', '');
            })
            ->with('candidatProfile')
            ->limit(50)
            ->get()
            ->filter(fn (User $candidate) => $this->positionMatches($offer->titre_poste, $candidate->candidatProfile?->poste_recherche))
            ->each(function (User $candidate) use ($offer) {
                UserNotification::create([
                    'user_id' => $candidate->id,
                    'type' => 'new_matching_offer',
                    'title' => 'Nouvelle offre proche de votre profil',
                    'message' => sprintf('Une nouvelle offre a %s correspond a votre profil: %s.', $offer->ville, $offer->titre_poste),
                    'data' => [
                        'offer_id' => $offer->id,
                        'action_url' => "/jobs/{$offer->id}",
                    ],
                ]);
            });
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
        unset($validated['image']);

        // Calculate expires_at
        $validated['expires_at'] = Carbon::now()->addDays((int) $validated['duree_validite']);
        $validated['recruteur_id'] = Auth::id();
        $validated['status'] = 'active';

        if ($request->hasFile('image')) {
            $validated['image_path'] = $request->file('image')->store('job-offers', 'public');
        }

        $offre = JobOffer::create($validated);
        $this->notifyMatchingCandidates($offre);
        AdminNotifier::notify(
            'admin_offer_created',
            'Nouvelle offre a verifier',
            sprintf('Le recruteur %s a publie une nouvelle offre: %s.', $request->user()?->name ?? 'Un recruteur', $offre->titre_poste),
            [
                'offer_id' => $offre->id,
                'recruteur_id' => $offre->recruteur_id,
                'action_url' => '/admin/dashboard',
            ],
        );

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
        $offres = JobOffer::with(['applications' => function ($query) {
                $query->select(['id', 'job_offer_id', 'candidat_id', 'status', 'quiz_score', 'created_at', 'updated_at'])
                    ->with('candidat:id,name,email')
                    ->latest();
            }])
            ->withCount('applications')
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
        unset($validated['image']);

        if (isset($validated['duree_validite']) && $validated['duree_validite'] !== $offre->duree_validite) {
            $validated['expires_at'] = Carbon::parse($offre->created_at)->addDays((int) $validated['duree_validite']);
        }

        if ($request->hasFile('image')) {
            if ($offre->image_path) {
                Storage::disk('public')->delete($offre->image_path);
            }

            $validated['image_path'] = $request->file('image')->store('job-offers', 'public');
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

        if ($offre->image_path) {
            Storage::disk('public')->delete($offre->image_path);
        }

        $offre->delete();

        return response()->json([
            'success' => true,
            'message' => 'Offre supprimee avec succes.',
        ]);
    }
}
