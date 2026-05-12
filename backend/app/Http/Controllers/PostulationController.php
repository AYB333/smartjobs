<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\JobOffer;
use App\Models\Application;
use App\Http\Requests\StorePostulationRequest;
use App\Http\Requests\UpdatePostulationStatusRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Carbon\Carbon;

class PostulationController extends Controller
{
    public function postuler(StorePostulationRequest $request, $id)
    {
        $offre = JobOffer::findOrFail($id);

        if ($offre->status === 'expired' || $offre->status === 'suspended') {
            return response()->json(['success' => false, 'message' => 'Cette offre n est plus disponible.'], 400);
        }

        $candidat_id = Auth::id();

        $alreadyApplied = Application::where('job_offer_id', $id)
                                     ->where('candidat_id', $candidat_id)
                                     ->exists();

        if ($alreadyApplied) {
            return response()->json(['success' => false, 'message' => 'Vous avez deja postule a cette offre.'], 400);
        }

        if ($offre->quiz) {
            return response()->json(['success' => false, 'message' => 'Cette offre requiert un quiz. Veuillez le completer d abord.'], 403);
        }

        $cvPath = null;
        if ($request->hasFile('cv')) {
            $cvPath = $request->file('cv')->store('cvs', 'public');
        }

        $application = Application::create([
            'job_offer_id' => $id,
            'candidat_id' => $candidat_id,
            'cv_path' => $cvPath,
            'status' => 'en_attente'
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Postulation envoyee avec succes.',
            'data' => $application
        ], 201);
    }

    public function mesPostulations()
    {
        $applications = Application::with('jobOffer')
                                   ->where('candidat_id', Auth::id())
                                   ->latest()
                                   ->paginate(10);

        return response()->json([
            'success' => true,
            'data' => $applications
        ]);
    }

    public function postulants($id)
    {
        $offre = JobOffer::findOrFail($id);
        /** @var \App\Models\User $user */
        $user = Auth::user();

        if ($offre->recruteur_id !== $user->id) {
            return response()->json(['success' => false, 'message' => 'Non autorise.'], 403);
        }

        // Phase 5: Premium Quota Logic
        $isPremium = $user->is_premium && $user->premium_expires_at && Carbon::parse($user->premium_expires_at)->isFuture();

        if (!$isPremium && $user->vues_aujourdhui >= 1) {
            return response()->json([
                'success' => false, 
                'message' => 'Quota de vue depasse ! Limite a 1 profil par jour. Passez au Premium pour un acces illimite.'
            ], 403);
        }

        if (!$isPremium) {
            $user->increment('vues_aujourdhui');
        }

        $postulants = Application::with('candidat.candidatProfile')
                                 ->where('job_offer_id', $id)
                                 ->latest()
                                 ->paginate(10);

        return response()->json([
            'success' => true,
            'data' => $postulants
        ]);
    }

    public function updateStatus(UpdatePostulationStatusRequest $request, $id)
    {
        $application = Application::with('jobOffer')->findOrFail($id);

        if ($application->jobOffer->recruteur_id !== Auth::id()) {
            return response()->json(['success' => false, 'message' => 'Non autorise.'], 403);
        }

        $application->update([
            'status' => $request->status
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Statut de la postulation mis a jour.',
            'data' => $application
        ]);
    }
}
