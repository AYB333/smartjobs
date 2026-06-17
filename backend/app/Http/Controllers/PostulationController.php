<?php

namespace App\Http\Controllers;

use App\Http\Requests\StorePostulationRequest;
use App\Http\Requests\UpdatePostulationStatusRequest;
use App\Models\Application;
use App\Models\CandidateProfileView;
use App\Models\JobOffer;
use App\Models\User;
use App\Models\UserNotification;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class PostulationController extends Controller
{
    private const FREE_PROFILE_LIMIT = 1;

    private function hasActivePremium(User $user): bool
    {
        return (bool) ($user->is_premium && $user->premium_expires_at && Carbon::parse($user->premium_expires_at)->isFuture());
    }

    private function latestFreeConsultation(User $recruteur): ?CandidateProfileView
    {
        /** @var CandidateProfileView|null $view */
        $view = CandidateProfileView::where('recruteur_id', $recruteur->id)
            ->where('viewed_at', '>=', Carbon::now()->subDay())
            ->latest('viewed_at')
            ->first();

        return $view;
    }

    private function syncFreeQuotaDisplay(User $recruteur, ?CandidateProfileView $latestView = null): void
    {
        if ($this->hasActivePremium($recruteur)) {
            return;
        }

        $latestView ??= $this->latestFreeConsultation($recruteur);

        $recruteur->forceFill([
            'vues_aujourdhui' => $latestView ? self::FREE_PROFILE_LIMIT : 0,
            'derniere_vue_date' => $latestView?->viewed_at?->toDateString(),
        ])->save();
    }

    public function postuler(StorePostulationRequest $request, $id)
    {
        $offre = JobOffer::findOrFail($id);

        if ($offre->status === 'expired' || $offre->status === 'suspended') {
            return response()->json(['success' => false, 'message' => 'Cette offre n est plus disponible.'], 400);
        }

        /** @var User|null $user */
        $user = Auth::user();
        $candidat_id = $user?->id;

        $existingApplication = Application::with('jobOffer.quiz')
            ->where('job_offer_id', $id)
            ->where('candidat_id', $candidat_id)
            ->first();

        if ($existingApplication) {
            return response()->json([
                'success' => false,
                'message' => 'Vous avez deja postule a cette offre.',
                'has_quiz' => $offre->quiz()->exists(),
                'data' => $existingApplication,
            ], 409);
        }

        $profile = $user?->candidatProfile;
        $hasCompleteProfile = $profile
            && filled($profile->ville)
            && filled($profile->experience)
            && filled($profile->poste_recherche);

        if (! $hasCompleteProfile || blank($profile?->cv_path)) {
            return response()->json([
                'success' => false,
                'message' => 'Complétez votre profil et ajoutez votre CV avant de postuler.',
            ], 422);
        }

        $application = Application::create([
            'job_offer_id' => $id,
            'candidat_id' => $candidat_id,
            'cv_path' => $profile->cv_path,
            'status' => 'en_attente',
        ]);

        UserNotification::create([
            'user_id' => $offre->recruteur_id,
            'type' => 'application_received',
            'title' => 'Nouvelle candidature recue',
            'message' => sprintf('%s a postule a votre offre "%s".', $user?->name ?? 'Un candidat', $offre->titre_poste),
            'data' => [
                'application_id' => $application->id,
                'offer_id' => $offre->id,
                'candidate_id' => $candidat_id,
                'action_url' => '/recruteur/candidatures',
            ],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Postulation envoyee avec succes.',
            'has_quiz' => $offre->quiz()->exists(),
            'data' => $application,
        ], 201);
    }

    public function mesPostulations(Request $request)
    {
        $limit = min(max($request->integer('limit', 10), 1), 100);

        $applications = Application::with('jobOffer.quiz')
            ->where('candidat_id', Auth::id())
            ->latest()
            ->paginate($limit);

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

        $postulants = Application::with('candidat:id,name,email')
            ->select(['id', 'job_offer_id', 'candidat_id', 'status', 'quiz_score', 'created_at', 'updated_at'])
            ->where('job_offer_id', $id)
            ->latest()
            ->paginate(10);

        return response()->json([
            'success' => true,
            'data' => $postulants,
        ]);
    }

    public function consult($id)
    {
        $application = Application::with(['jobOffer', 'candidat.candidatProfile'])->findOrFail($id);

        /** @var User $recruteur */
        $recruteur = Auth::user();

        if ($application->jobOffer->recruteur_id !== $recruteur->id) {
            return response()->json(['success' => false, 'message' => 'Non autorise.'], 403);
        }

        if (! $this->hasActivePremium($recruteur)) {
            $latestView = $this->latestFreeConsultation($recruteur);

            if ($latestView && (int) $latestView->candidat_id !== (int) $application->candidat_id) {
                $resetAt = Carbon::parse($latestView->viewed_at)->addDay();
                $this->syncFreeQuotaDisplay($recruteur, $latestView);

                return response()->json([
                    'success' => false,
                    'code' => 'quota_exceeded',
                    'message' => 'Votre quota gratuit est épuisé. Passez Premium pour consulter des profils illimités.',
                    'reset_at' => $resetAt,
                    'quota' => [
                        'is_premium' => false,
                        'limit' => self::FREE_PROFILE_LIMIT,
                        'used' => self::FREE_PROFILE_LIMIT,
                        'remaining' => 0,
                        'reset_at' => $resetAt,
                    ],
                ], 403);
            }

            if (! $latestView) {
                $latestView = CandidateProfileView::create([
                    'recruteur_id' => $recruteur->id,
                    'candidat_id' => $application->candidat_id,
                    'application_id' => $application->id,
                    'viewed_at' => Carbon::now(),
                ]);
            }

            $this->syncFreeQuotaDisplay($recruteur, $latestView);
        }

        return response()->json([
            'success' => true,
            'data' => $application,
            'quota' => [
                'is_premium' => $this->hasActivePremium($recruteur),
                'limit' => self::FREE_PROFILE_LIMIT,
                'used' => $this->hasActivePremium($recruteur) ? 0 : self::FREE_PROFILE_LIMIT,
                'remaining' => $this->hasActivePremium($recruteur) ? null : 0,
                'reset_at' => $this->hasActivePremium($recruteur) ? null : $this->latestFreeConsultation($recruteur)?->viewed_at?->copy()->addDay(),
            ],
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

        $isAccepted = $request->status === 'acceptee';

        UserNotification::create([
            'user_id' => $application->candidat_id,
            'type' => $isAccepted ? 'application_accepted' : 'application_refused',
            'title' => $isAccepted ? 'Candidature acceptee' : 'Candidature refusee',
            'message' => $isAccepted
                ? 'Votre candidature a ete acceptee. Le recruteur peut maintenant vous contacter.'
                : 'Votre candidature n a pas ete retenue pour cette offre. Continuez a postuler a d autres opportunites.',
            'data' => [
                'application_id' => $application->id,
                'offer_id' => $application->job_offer_id,
                'status' => $request->status,
                'action_url' => '/candidat/dashboard',
            ],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Statut de la postulation mis a jour.',
            'data' => $application,
        ]);
    }
}
