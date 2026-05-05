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

class PostulationController extends Controller
{
    /**
     * Candidat applies to an offer.
     */
    public function postuler(StorePostulationRequest $request, $id)
    {
        $offre = JobOffer::findOrFail($id);

        if ($offre->status === 'expired' || $offre->status === 'suspended') {
            return response()->json(['success' => false, 'message' => 'Cette offre n est plus disponible.'], 400);
        }

        $candidat_id = Auth::id();

        // Check if already applied
        $alreadyApplied = Application::where('job_offer_id', $id)
                                     ->where('candidat_id', $candidat_id)
                                     ->exists();

        if ($alreadyApplied) {
            return response()->json(['success' => false, 'message' => 'Vous avez deja postule a cette offre.'], 400);
        }

        // Check if offer has quiz (Basic check for now, can be expanded in Quiz phase)
        if ($offre->quiz) {
            // Ideally here we check if a passing quiz attempt exists in db
            return response()->json(['success' => false, 'message' => 'Cette offre requiert un quiz. Veuillez le completer d abord.'], 403);
        }

        // Upload CV
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

    /**
     * Candidat sees all his applications.
     */
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

    /**
     * Recruteur sees all applicants for his offer.
     */
    public function postulants($id)
    {
        $offre = JobOffer::findOrFail($id);

        if ($offre->recruteur_id !== Auth::id()) {
            return response()->json(['success' => false, 'message' => 'Non autorise.'], 403);
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

    /**
     * Recruteur accepts or refuses an application.
     */
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