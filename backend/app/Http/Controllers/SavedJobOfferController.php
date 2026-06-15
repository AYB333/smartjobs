<?php

namespace App\Http\Controllers;

use App\Models\JobOffer;
use App\Models\SavedJobOffer;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class SavedJobOfferController extends Controller
{
    public function index(): JsonResponse
    {
        $savedOffers = SavedJobOffer::with('jobOffer.recruteur.recruteurProfile')
            ->where('user_id', Auth::id())
            ->latest()
            ->get();

        return response()->json([
            'success' => true,
            'offer_ids' => $savedOffers->pluck('job_offer_id')->values(),
            'data' => $savedOffers,
        ]);
    }

    public function store(int $id): JsonResponse
    {
        $offer = JobOffer::findOrFail($id);

        if ($offer->status !== 'active' || Carbon::parse($offer->expires_at)->endOfDay()->isPast()) {
            return response()->json([
                'success' => false,
                'message' => 'Cette offre ne peut pas etre sauvegardee.',
            ], 422);
        }

        $savedOffer = SavedJobOffer::firstOrCreate([
            'user_id' => Auth::id(),
            'job_offer_id' => $offer->id,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Offre sauvegardee.',
            'data' => $savedOffer->load('jobOffer.recruteur.recruteurProfile'),
        ], 201);
    }

    public function destroy(int $id): JsonResponse
    {
        SavedJobOffer::where('user_id', Auth::id())
            ->where('job_offer_id', $id)
            ->delete();

        return response()->json([
            'success' => true,
            'message' => 'Offre retiree des favoris.',
        ]);
    }
}
