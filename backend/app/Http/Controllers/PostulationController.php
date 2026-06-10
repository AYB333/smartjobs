<?php

namespace App\Http\Controllers;

use App\Http\Requests\StorePostulationRequest;
use App\Http\Requests\UpdatePostulationStatusRequest;
use App\Models\Application;
use App\Models\JobOffer;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;

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

        $cvPath = null;
        if ($request->hasFile('cv')) {
            $cvPath = $request->file('cv')->store('cvs', 'public');
        }

        $application = Application::create([
            'job_offer_id' => $id,
            'candidat_id' => $candidat_id,
            'cv_path' => $cvPath,
            'status' => 'en_attente',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Postulation envoyee avec succes.',
            'has_quiz' => $offre->quiz()->exists(),
            'data' => $application,
        ], 201);
    }

    public function mesPostulations()
    {
        $applications = Application::with('jobOffer.quiz')
            ->where('candidat_id', Auth::id())
            ->latest()
            ->paginate(10);

        return response()->json([
            'success' => true,
            'data' => $applications,
        ]);
    }

    public function postulants($id)
    {
        $offre = JobOffer::findOrFail($id);
        /** @var User $user */
        $user = Auth::user();

        if ($offre->recruteur_id !== $user->id) {
            return response()->json(['success' => false, 'message' => 'Non autorise.'], 403);
        }

        $isPremium = $user->is_premium && $user->premium_expires_at && Carbon::parse($user->premium_expires_at)->isFuture();
        if (! $isPremium) {
            $today = Carbon::today();
            $alreadyViewedToday = $user->derniere_vue_date
                && Carbon::parse($user->derniere_vue_date)->isSameDay($today);

            if ($alreadyViewedToday && (int) $user->vues_aujourdhui >= 1) {
                return response()->json([
                    'success' => false,
                    'message' => 'Quota de vue depasse ! Limite a 1 profil par jour. Passez au Premium pour un acces illimite.',
                ], 403);
            }

            if (! $alreadyViewedToday) {
                $user->forceFill([
                    'vues_aujourdhui' => 1,
                    'derniere_vue_date' => $today->toDateString(),
                ])->save();
            }
        }

        $postulants = Application::with('candidat.candidatProfile')
            ->where('job_offer_id', $id)
            ->latest()
            ->paginate(10);

        return response()->json([
            'success' => true,
            'data' => $postulants,
        ]);
    }

    public function updateStatus(UpdatePostulationStatusRequest $request, $id)
    {
        $application = Application::with('jobOffer')->findOrFail($id);

        if ($application->jobOffer->recruteur_id !== Auth::id()) {
            return response()->json(['success' => false, 'message' => 'Non autorise.'], 403);
        }

        $application->update([
            'status' => $request->status,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Statut de la postulation mis a jour.',
            'data' => $application,
        ]);
    }
}
